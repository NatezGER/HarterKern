interface RefreshCoordinatorOptions {
  rerunIfRequested?: boolean;
}

export function createRefreshCoordinator(
  load: () => Promise<void>,
  { rerunIfRequested = true }: RefreshCoordinatorOptions = {},
) {
  let current: Promise<void> | null = null;
  let refreshAgain = false;

  return () => {
    if (current) {
      refreshAgain = rerunIfRequested;
      return current;
    }

    const drain = async () => {
      do {
        refreshAgain = false;
        await load();
      } while (refreshAgain);
    };

    const task = drain().finally(() => {
      if (current === task) current = null;
    });
    current = task;
    return task;
  };
}
