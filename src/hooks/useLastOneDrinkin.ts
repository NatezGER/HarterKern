import { useEffect, useState } from "react";
import {
  createInitialLastOneDrinkinState,
  LAST_ONE_DRINKIN_STORAGE_KEY,
  restoreLastOneDrinkinState,
  serializeLastOneDrinkinState,
  type LastOneDrinkinState,
} from "@/lib/lastOneDrinkin";

interface StoredState {
  state: LastOneDrinkinState | null;
  error: string | null;
}

function loadStoredState(): StoredState {
  if (typeof window === "undefined") return { state: createInitialLastOneDrinkinState(), error: null };
  try {
    const raw = window.localStorage.getItem(LAST_ONE_DRINKIN_STORAGE_KEY);
    return raw === null ? { state: createInitialLastOneDrinkinState(), error: null } : restoreLastOneDrinkinState(raw);
  } catch {
    return { state: null, error: "Der lokale Eventstand kann auf diesem Gerät nicht gelesen werden. Es wurde nichts überschrieben." };
  }
}

export function useLastOneDrinkin() {
  const [stored, setStored] = useState<StoredState>(loadStoredState);

  useEffect(() => {
    if (!stored.state || stored.error || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAST_ONE_DRINKIN_STORAGE_KEY, serializeLastOneDrinkinState(stored.state));
    } catch {
      setStored((current) => ({ ...current, error: "Änderungen konnten lokal nicht gespeichert werden. Der vorhandene Speicherstand wurde nicht gelöscht." }));
    }
  }, [stored.error, stored.state]);

  const setState = (updater: (current: LastOneDrinkinState) => LastOneDrinkinState) => {
    setStored((current) => current.state && !current.error ? { ...current, state: updater(current.state) } : current);
  };

  return { state: stored.state, error: stored.error, setState };
}
