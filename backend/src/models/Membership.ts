import { Schema, model, Document, Types } from "mongoose";

export type MembershipRole = "owner" | "member";
export type MembershipStatus = "active" | "invited";

export interface IMembership extends Document {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId | null;
  email: string;
  role: MembershipRole;
  status: MembershipStatus;
  inviteTokenHash: string | null;
  inviteExpires: Date | null;
  createdAt: Date;
}

const membershipSchema = new Schema<IMembership>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ["owner", "member"], default: "member" },
  status: { type: String, enum: ["active", "invited"], default: "active" },
  inviteTokenHash: { type: String, default: null, select: false },
  inviteExpires: { type: Date, default: null, select: false },
  createdAt: { type: Date, default: Date.now },
});

membershipSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export const Membership = model<IMembership>("Membership", membershipSchema);
