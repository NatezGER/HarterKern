export function claimAttemptSave(savingRef: { current: boolean }) {
  if (savingRef.current) return false;
  savingRef.current = true;
  return true;
}
