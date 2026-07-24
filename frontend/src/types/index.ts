export interface User {
  id: string;
  email: string;
  name: string;
}

export type OrgPlan = "community" | "business";
export type OrgRole = "owner" | "member";

export interface Organization {
  id: string;
  name: string;
  plan: OrgPlan;
}

export interface TeamMember {
  id: string;
  email: string;
  role: OrgRole;
  status: "active" | "invited";
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
  source: "manual" | "timer";
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
