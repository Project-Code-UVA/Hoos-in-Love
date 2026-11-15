import { useSyncExternalStore } from "react";
import { MOCK_CURRENT_USER } from "./mockCurrentUser";

type MockProfile = Omit<typeof MOCK_CURRENT_USER, "photoUri"> & {
  photoUri?: string;
  photos: (string | null)[];
};

let profile: MockProfile = {
  ...MOCK_CURRENT_USER,
  photos: [null, null, null, null, null, null],
};

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getProfile() {
  return profile;
}

export function useMockProfile() {
  return useSyncExternalStore(subscribe, getProfile);
}

export function saveMockProfile(updates: Partial<MockProfile>) {
  profile = { ...profile, ...updates };
  listeners.forEach((listener) => listener());
}