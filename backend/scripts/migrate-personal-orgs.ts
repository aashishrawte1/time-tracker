// One-off migration: give every pre-existing user (from before organizations
// existed) a personal Organization + owner Membership, and backfill
// organizationId onto their existing Projects. Safe to re-run — skips users
// who already have a membership.
//
// Usage: MONGODB_URI=... npx ts-node scripts/migrate-personal-orgs.ts
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db";
import { User } from "../src/models/User";
import { Organization } from "../src/models/Organization";
import { Membership } from "../src/models/Membership";
import { Project } from "../src/models/Project";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI environment variable is required");
  await connectDB(uri);

  const users = await User.find();
  let migrated = 0;

  for (const user of users) {
    const existing = await Membership.findOne({ userId: user._id });
    if (existing) continue;

    const org = await Organization.create({ name: `${user.name}'s workspace`, plan: "community" });
    await Membership.create({
      organizationId: org._id,
      userId: user._id,
      email: user.email,
      role: "owner",
      status: "active",
    });

    // Legacy Project docs still have `userId` on them even though it's no
    // longer in the schema — reach it via the raw collection.
    await mongoose.connection.collection("projects").updateMany(
      { userId: user._id, organizationId: { $exists: false } },
      { $set: { organizationId: org._id, createdBy: user._id } },
    );

    migrated++;
    console.log(`Migrated ${user.email} -> org ${org._id}`);
  }

  const orphanProjects = await Project.countDocuments({ organizationId: { $exists: false } });
  if (orphanProjects > 0) {
    console.warn(`${orphanProjects} project(s) still have no organizationId — check for orphaned userId references.`);
  }

  console.log(`Done. Migrated ${migrated} user(s) out of ${users.length}.`);
  await mongoose.connection.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
