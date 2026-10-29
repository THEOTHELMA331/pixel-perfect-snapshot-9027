export type Priority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "in_progress" | "done";
export type PreferredTime = "any" | "morning" | "afternoon" | "evening";

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate?: string; // YYYY-MM-DD
  duration: number; // minutes
  priority: Priority;
  category: string;
  status: TaskStatus;
  preferredTime: PreferredTime;
  owner?: string;
  dependsOn?: string[];
  sourceMeetingId?: string;
  sourceMeetingTitle?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ActionItem {
  id: string;
  description: string;
  owner: string | null;
  deadline: string | null; // YYYY-MM-DD or as written
  status: string;
  context: string | null;
}

export interface MeetingSummary {
  overview: string;
  topics: string[];
  decisions: string[];
  proposals: string[];
  actionItems: ActionItem[];
  deadlines: { item: string; date: string }[];
  openQuestions: string[];
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  attendees: string;
  notes: string;
  length: string;
  summary: MeetingSummary;
  createdAt: string;
}

export interface Email {
  id: string;
  subject: string;
  body: string;
  tone: string;
  category: string;
  createdAt: string;
}

export interface Commitment {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string;
}

export interface Settings {
  name: string;
  startTime: string;
  endTime: string;
  workDays: number[]; // 0=Sun
  breakMinutes: number;
  maxSession: number;
  commitments: Commitment[];
}

export interface ScheduleBlock {
  taskId?: string;
  title: string;
  date: string;
  start: number; // minutes from midnight
  end: number;
  kind: "task" | "break" | "commitment";
}

export interface Unscheduled {
  taskId: string;
  title: string;
  reason: string;
}

export interface Schedule {
  generatedAt: string;
  mode: "day" | "week";
  startDate: string;
  days: string[];
  blocks: ScheduleBlock[];
  unscheduled: Unscheduled[];
}
