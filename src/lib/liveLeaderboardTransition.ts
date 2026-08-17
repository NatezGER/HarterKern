import { getLiveStandings } from "@/lib/liveEventCalculations";
import type {
  LiveAttempt,
  LiveEvent,
  LiveEventState,
  LiveLeaderboardTransition,
} from "@/types/liveEvent";

export function deriveLiveLeaderboardTransition(input: {
  before: LiveEventState;
  event: LiveEvent;
  attempt: LiveAttempt;
}): LiveLeaderboardTransition | null {
  const { before, event, attempt } = input;
  const beforeStandings = getLiveStandings(event, before.attempts, before.players);
  const afterStandings = getLiveStandings(
    event,
    [...before.attempts.filter(({ id }) => id !== attempt.id), attempt],
    before.players,
  );
  const previous = beforeStandings.find(({ player }) => player.id === attempt.playerId);
  const next = afterStandings.find(({ player }) => player.id === attempt.playerId);
  if (!previous || !next || next.bestTime == null || next.rank == null ||
    (previous.bestTime != null && next.bestTime >= previous.bestTime)) return null;

  const previousIndex = beforeStandings.findIndex(({ player }) => player.id === attempt.playerId);
  const nextIndex = afterStandings.findIndex(({ player }) => player.id === attempt.playerId);
  const gainedPositions = Math.max(0, previousIndex - nextIndex);
  const previousEventBest = beforeStandings.find(({ bestTime }) => bestTime != null)?.bestTime ?? null;
  const isNewEventBest = previousEventBest == null || next.bestTime < previousEventBest;
  const tookLead = next.rank === 1 && previous.rank !== 1 && isNewEventBest;
  const intensity = tookLead ? "lead"
    : gainedPositions > 1 ? "multi-position"
      : gainedPositions === 1 ? "position" : "best-time";

  return {
    attempt,
    playerId: attempt.playerId,
    previousBestTime: previous.bestTime,
    nextBestTime: next.bestTime,
    previousRank: previous.rank,
    nextRank: next.rank,
    gainedPositions,
    isNewPersonalEventBest: true,
    isNewEventBest,
    tookLead,
    intensity,
    beforeStandings,
    afterStandings,
  };
}

export function enqueueLiveLeaderboardTransition(
  queue: LiveLeaderboardTransition[],
  transition: LiveLeaderboardTransition,
) {
  return queue.some(({ attempt }) => attempt.id === transition.attempt.id)
    ? queue : [...queue, transition];
}

export function completeLiveLeaderboardTransition(queue: LiveLeaderboardTransition[]) {
  return queue.slice(1);
}

export function canPresentLiveLeaderboardTransition(input: {
  hasPostAttempt: boolean;
  hasCelebration: boolean;
  hasBadgeUnlock: boolean;
  badgeLookupPending: boolean;
}) {
  return !input.hasPostAttempt && !input.hasCelebration && !input.hasBadgeUnlock &&
    !input.badgeLookupPending;
}

export function getLiveLeaderboardMotion(reducedMotion: boolean) {
  return reducedMotion
    ? { layoutDuration: 0, highlightDuration: 0, completionDelay: 1_300 }
    : { layoutDuration: 0.65, highlightDuration: 1.15, completionDelay: 1_300 };
}

export type LeaderboardPresentationStage =
  | "waiting"
  | "scrolling"
  | "animating"
  | "complete";

export type LeaderboardPresentationEvent =
  | "p10c-complete"
  | "scroll-complete"
  | "animation-complete"
  | "reset";

export function advanceLeaderboardPresentation(
  stage: LeaderboardPresentationStage,
  event: LeaderboardPresentationEvent,
): LeaderboardPresentationStage {
  if (event === "reset") return "waiting";
  if (stage === "waiting" && event === "p10c-complete") return "scrolling";
  if (stage === "scrolling" && event === "scroll-complete") return "animating";
  if (stage === "animating" && event === "animation-complete") return "complete";
  return stage;
}

export function getLeaderboardPresentationSettings(reducedMotion: boolean) {
  return reducedMotion
    ? { behavior: "auto" as const, fallbackTimeout: 0 }
    : { behavior: "smooth" as const, fallbackTimeout: 2_000 };
}

interface LeaderboardScrollSample {
  top: number;
  bottom: number;
  height: number;
  scrollY: number;
  viewportHeight: number;
  scrollMarginTop: number;
}

interface LeaderboardScrollRuntime {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (handle: number) => void;
  setFallback: (callback: () => void, delay: number) => number;
  clearFallback: (handle: number) => void;
  read: () => LeaderboardScrollSample;
}

function browserScrollRuntime(target: Element): LeaderboardScrollRuntime {
  return {
    requestFrame: window.requestAnimationFrame.bind(window),
    cancelFrame: window.cancelAnimationFrame.bind(window),
    setFallback: window.setTimeout.bind(window),
    clearFallback: window.clearTimeout.bind(window),
    read: () => {
      const rect = target.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        scrollY: window.scrollY,
        viewportHeight: window.innerHeight,
        scrollMarginTop: Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0,
      };
    },
  };
}

export function startLeaderboardScroll(
  target: Element | null,
  reducedMotion: boolean,
  onComplete: () => void,
  runtime?: LeaderboardScrollRuntime,
) {
  const settings = getLeaderboardPresentationSettings(reducedMotion);
  target?.scrollIntoView({ behavior: settings.behavior, block: "start" });
  if (reducedMotion || !target) {
    onComplete();
    return () => undefined;
  }

  const activeRuntime = runtime ?? browserScrollRuntime(target);
  const initialScrollY = activeRuntime.read().scrollY;
  let previousScrollY = initialScrollY;
  let stableFrames = 0;
  let frameHandle = 0;
  let fallbackHandle = 0;
  let completed = false;

  const finish = () => {
    if (completed) return;
    completed = true;
    if (frameHandle) activeRuntime.cancelFrame(frameHandle);
    if (fallbackHandle) activeRuntime.clearFallback(fallbackHandle);
    onComplete();
  };
  const checkPosition = () => {
    const sample = activeRuntime.read();
    const stable = Math.abs(sample.scrollY - previousScrollY) < 0.5;
    stableFrames = stable ? stableFrames + 1 : 0;
    previousScrollY = sample.scrollY;
    const atRequestedPosition = Math.abs(sample.top - sample.scrollMarginTop) <= 12;
    const meaningfullyVisible = sample.top >= 0 &&
      sample.top <= sample.viewportHeight * 0.6 &&
      sample.bottom >= Math.min(sample.viewportHeight, sample.top + Math.min(160, sample.height));
    const scrollMoved = Math.abs(sample.scrollY - initialScrollY) >= 1;
    if ((atRequestedPosition && stableFrames >= 1) ||
      (meaningfullyVisible && scrollMoved && stableFrames >= 3)) {
      finish();
      return;
    }
    frameHandle = activeRuntime.requestFrame(checkPosition);
  };

  frameHandle = activeRuntime.requestFrame(checkPosition);
  fallbackHandle = activeRuntime.setFallback(finish, settings.fallbackTimeout);
  return () => {
    completed = true;
    if (frameHandle) activeRuntime.cancelFrame(frameHandle);
    if (fallbackHandle) activeRuntime.clearFallback(fallbackHandle);
  };
}

export function isLeaderboardAnimationReady(input: {
  transitionReady: boolean;
  transitionAttemptId: string | null;
  presentationAttemptId: string | null;
  stage: LeaderboardPresentationStage;
}) {
  return input.transitionReady && input.stage === "animating" &&
    input.transitionAttemptId != null &&
    input.transitionAttemptId === input.presentationAttemptId;
}
