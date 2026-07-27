const storageKey = "harter-kern-client-id";

export function getClientIdentifier() {
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const identifier = `${crypto.randomUUID()}-${Date.now().toString(36)}`;
  window.localStorage.setItem(storageKey, identifier);
  return identifier;
}
