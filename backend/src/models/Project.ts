import { Schema, model, Document, Types } from "mongoose";

export interface IProject extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  color: string;
  archived: boolean;
  createdAt: Date;
}

const projectSchema = new Schema<IProject>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: "#6366f1" },
  archived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

projectSchema.index({ userId: 1, name: 1 }, { unique: true });

export const Project = model<IProject>("Project", projectSchema);
