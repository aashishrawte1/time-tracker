import { Schema, model, Document, Types } from "mongoose";

export type OrgPlan = "community" | "business";

export interface IOrganization extends Document {
  _id: Types.ObjectId;
  name: string;
  plan: OrgPlan;
  createdAt: Date;
}

const organizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true, trim: true },
  plan: { type: String, enum: ["community", "business"], default: "community" },
  createdAt: { type: Date, default: Date.now },
});

export const Organization = model<IOrganization>("Organization", organizationSchema);
