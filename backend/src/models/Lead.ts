import { Schema, model, Document, Types } from "mongoose";

export interface ILead extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  company: string;
  teamSize: string;
  message: string;
  createdAt: Date;
}

const leadSchema = new Schema<ILead>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  company: { type: String, default: "", trim: true },
  teamSize: { type: String, default: "", trim: true },
  message: { type: String, default: "", trim: true },
  createdAt: { type: Date, default: Date.now },
});

export const Lead = model<ILead>("Lead", leadSchema);
