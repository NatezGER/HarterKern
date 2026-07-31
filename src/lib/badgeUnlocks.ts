export function takeUnseenUnlocks<T extends { key: string }>(
  unlocks: T[],
  presented: Set<string>,
) {
  return unlocks.filter(({ key }) => {
    if (presented.has(key)) return false;
    presented.add(key);
    return true;
  });
}
