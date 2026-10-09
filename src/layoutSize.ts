import { useSyncExternalStore } from 'react';

type Size = { width: number; height: number } | null;

let current: Size = null;
const listeners = new Set<() => void>();

export function setLayoutSize(width: number, height: number) {
  if (
    current &&
    Math.round(current.width) === Math.round(width) &&
    Math.round(current.height) === Math.round(height)
  ) {
    return;
  }
  current = { width, height };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Size {
  return current;
}

export function useLayoutSize(): Size {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
