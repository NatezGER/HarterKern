/** Attach lifecycle cancellation without changing unsignalled callers. */
export function readSignal<T extends { abortSignal(signal: AbortSignal): T }>(query: T, signal?: AbortSignal): T {
  signal?.throwIfAborted();
  return signal ? query.abortSignal(signal) : query;
}
