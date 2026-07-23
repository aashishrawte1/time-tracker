import { Schema, model, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  resetPasswordTokenHash: string | null;
  resetPasswordExpires: Date | null;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  resetPasswordTokenHash: { type: String, default: null, select: false },
  resetPasswordExpires: { type: Date, default: null, select: false },
  createdAt: { type: Date, default: Date.now },
});

export const User = model<IUser>("User", userSchema);
