"use client";

import { parseFitProfile, type FitProfile } from "@/lib/fit";
import { createLocalStore } from "@/lib/local-store";

const store = createLocalStore<FitProfile | null>({
  key: "tf-fit-profile-v1",
  empty: null,
  parse: (raw) => {
    if (!raw) return null;
    try {
      return parseFitProfile(JSON.parse(raw));
    } catch {
      return null;
    }
  },
  serialize: (profile) => (profile ? JSON.stringify(profile) : null),
});

/**
 * The shopper's body measurements stay on their device (localStorage) – they are only ever
 * used in the browser to recommend a size and are never sent to the server.
 */
export const fitProfile = {
  save: (profile: FitProfile) => store.set(profile),
  clear: () => store.set(null),
};

export const useFitProfile = store.useValue;
