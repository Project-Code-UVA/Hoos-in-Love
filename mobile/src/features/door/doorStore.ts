import { useSyncExternalStore } from "react";
import type { DoorItem } from "./types";

/**
 * In-memory store for the current user's door, following the same pattern as
 * `profiles/mockProfileStore.ts`. Swap `saveMyDoor` for an API call once the
 * backend has a door/profile endpoint.
 */

let myDoorItems: DoorItem[] = [];

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getMyDoor() {
  return myDoorItems;
}

export function useMyDoor() {
  return useSyncExternalStore(subscribe, getMyDoor, getMyDoor);
}

export function saveMyDoor(items: DoorItem[]) {
  myDoorItems = items;
  listeners.forEach((listener) => listener());
}
