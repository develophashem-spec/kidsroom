"use client";

import { useSyncExternalStore } from "react";

type StoreOptions<T> = {
  /** localStorage key. */
  key: string;
  /** What the server (and the very first client render) sees. Must be a stable reference. */
  empty: T;
  /** Turns the raw stored string into a valid value. Must never throw. */
  parse: (raw: string | null) => T;
  /** Returns `null` when the value should be removed from storage instead of saved. */
  serialize: (value: T) => string | null;
};

/**
 * A tiny localStorage-backed store for `useSyncExternalStore`.
 *
 * - Snapshots are cached, so React gets the same reference until something changes.
 * - Changes made in other tabs are picked up through the `storage` event.
 * - Storage being unavailable (private mode, blocked cookies) degrades to an in-memory value.
 */
export function createLocalStore<T>({ key, empty, parse, serialize }: StoreOptions<T>) {
  let snapshot: T = empty;
  let loaded = false;
  const listeners = new Set<() => void>();

  function read(): T {
    if (!loaded) {
      try {
        snapshot = parse(window.localStorage.getItem(key));
      } catch {
        snapshot = empty;
      }
      loaded = true;
    }
    return snapshot;
  }

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        loaded = false;
        emit();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function write(next: T) {
    snapshot = next;
    loaded = true;
    try {
      const serialized = serialize(next);
      if (serialized === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, serialized);
    } catch {
      // Keep the in-memory value; persistence is best effort.
    }
    emit();
  }

  return {
    /** Subscribes the calling component to the stored value. */
    useValue: (): T => useSyncExternalStore(subscribe, read, () => empty),
    /** Current value (client only). */
    get: read,
    set: write,
  };
}
