import { useSyncExternalStore } from "react";
import type { Email, Meeting, Schedule, Settings, Task } from "./types";

export interface AppData {
  tasks: Task[];
  meetings: Meeting[];
  emails: Email[];
  schedule: Schedule | null;
  settings: Settings;
}

const KEY = "ai-productivity-assistant:v1";

export const defaultSettings: Settings = {
  name: "",
  startTime: "09:00",
  endTime: "17:00",
  workDays: [1, 2, 3, 4, 5],
  breakMinutes: 15,
  maxSession: 90,
  commitments: [],
};

const empty: AppData = { tasks: [], meetings: [], emails: [], schedule: null, settings: defaultSettings };

let state: AppData = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...empty, ...parsed, settings: { ...defaultSettings, ...parsed.settings } };
    }
  } catch {
    /* ignore corrupt storage */
  }
}

export function setData(updater: (d: AppData) => AppData) {
  load();
  state = updater(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useData(): AppData {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => empty,
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** True when a task with the same description from the same meeting already exists. */
export function isDuplicateTask(tasks: Task[], title: string, meetingId?: string) {
  const n = normalize(title);
  return tasks.some((t) => normalize(t.title) === n && (!meetingId || t.sourceMeetingId === meetingId || !t.sourceMeetingId));
}
