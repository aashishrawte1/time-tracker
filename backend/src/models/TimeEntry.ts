import { Schema, model, Document, Types } from "mongoose";

export type TimeEntrySource = "manual" | "timer";

export interface ITimeEntry extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  projectId: Types.ObjectId;
  startTime: Date;
  endTime: Date | null;
  durationSeconds: number;
  note: string;
  source: TimeEntrySource;
  createdAt: Date;
}

const timeEntrySchema = new Schema<ITimeEntry>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, default: null },
  durationSeconds: { type: Number, default: 0 },
  note: { type: String, default: "", trim: true },
  source: { type: String, enum: ["manual", "timer"], default: "manual" },
  createdAt: { type: Date, default: Date.now },
});

timeEntrySchema.index({ userId: 1, startTime: -1 });

export const TimeEntry = model<ITimeEntry>("TimeEntry", timeEntrySchema);
