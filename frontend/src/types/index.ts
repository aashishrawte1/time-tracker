export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Project {
  _id: string;
  name: string;
  color: string;
  archived: boolean;
  createdAt: string;
}

export interface PopulatedProjectRef {
  _id: string;
  name: string;
  color: string;
}

export interface TimeEntry {
  _id: string;
  userId: string;
  projectId: PopulatedProjectRef | string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  note: string;
}

export interface SummaryProjectRow {
  projectId: string;
  projectName: string;
  projectColor: string;
  totalSeconds: number;
  entryCount: number;
}

export interface Summary {
  range: "daily" | "weekly" | "monthly";
  start: string;
  end: string;
  totalSeconds: number;
  projects: SummaryProjectRow[];
}
