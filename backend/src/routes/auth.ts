import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../models/User";
import { Organization } from "../models/Organization";
import { Membership, MembershipRole } from "../models/Membership";
import { signToken } from "../utils/jwt";
import { sendPasswordResetEmail } from "../utils/email";
import { requireAuth, AuthRequest } from "../middleware/auth";

async function orgSummary(organizationId: string, role: MembershipRole) {
  const org = await Organization.findById(organizationId);
  return { organization: { id: org!._id, name: org!.name, plan: org!.plan }, role };
}

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password and name are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email: normalizedEmail, passwordHash, name: name.trim() });

  const org = await Organization.create({ name: `${user.name}'s workspace`, plan: "community" });
  await Membership.create({
    organizationId: org._id,
    userId: user._id,
    email: user.email,
    role: "owner",
    status: "active",
  });

  const token = signToken({ userId: user._id.toString(), orgId: org._id.toString() });
  res.status(201).json({
    token,
    user: { id: user._id, email: user.email, name: user.name },
    organization: { id: org._id, name: org.name, plan: org.plan },
    role: "owner",
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const membership = await Membership.findOne({ userId: user._id, status: "active" });
  if (!membership) {
    return res.status(500).json({ error: "No active organization found for this account" });
  }

  const token = signToken({ userId: user._id.toString(), orgId: membership.organizationId.toString() });
  res.json({
    token,
    user: { id: user._id, email: user.email, name: user.name },
    ...(await orgSummary(membership.organizationId.toString(), membership.role)),
  });
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  const genericResponse = { message: "If an account exists for that email, we've sent a password reset link." };

  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordTokenHash = hashToken(rawToken);
  user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetUrl = `${frontendUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
  } catch (err) {
    console.error("Failed to send password reset email", err);
  }

  res.json(genericResponse);
});

router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body as { token?: string; password?: string };

  if (!token || !password) {
    return res.status(400).json({ error: "token and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const user = await User.findOne({
    resetPasswordTokenHash: hashToken(token),
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordTokenHash +resetPasswordExpires");

  if (!user) {
    return res.status(400).json({ error: "This reset link is invalid or has expired" });
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.json({ message: "Your password has been reset. You can now log in." });
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId).select("email name createdAt");
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    user: { id: user._id, email: user.email, name: user.name },
    ...(await orgSummary(req.orgId!, req.orgRole!)),
  });
});

export default router;
