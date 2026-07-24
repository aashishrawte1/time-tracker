import { Router, Response } from "express";
import crypto from "crypto";
import { Organization } from "../models/Organization";
import { Membership } from "../models/Membership";
import { User } from "../models/User";
import { signToken } from "../utils/jwt";
import { sendOrgInviteEmail } from "../utils/email";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const router = Router();

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const org = await Organization.findById(req.orgId);
  if (!org) {
    return res.status(404).json({ error: "Organization not found" });
  }

  const response: Record<string, unknown> = {
    organization: { id: org._id, name: org.name, plan: org.plan },
    role: req.orgRole,
  };

  if (req.orgRole === "owner") {
    const memberships = await Membership.find({ organizationId: org._id }).sort({ createdAt: 1 });
    response.members = memberships.map((m) => ({
      id: m._id,
      email: m.email,
      role: m.role,
      status: m.status,
    }));
  }

  res.json(response);
});

router.post("/invite", requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.orgRole !== "owner") {
    return res.status(403).json({ error: "Only the organization owner can invite teammates" });
  }

  const org = await Organization.findById(req.orgId);
  if (!org) {
    return res.status(404).json({ error: "Organization not found" });
  }
  if (org.plan !== "business") {
    return res.status(403).json({ error: "Upgrade to the Business plan to invite teammates" });
  }

  const { email } = req.body as { email?: string };
  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await Membership.findOne({ organizationId: org._id, email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: "This person is already a member or has a pending invite" });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const membership = await Membership.create({
    organizationId: org._id,
    userId: null,
    email: normalizedEmail,
    role: "member",
    status: "invited",
    inviteTokenHash: hashToken(rawToken),
    inviteExpires: new Date(Date.now() + INVITE_TOKEN_TTL_MS),
  });

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const acceptUrl = `${frontendUrl.replace(/\/$/, "")}/accept-invite?token=${rawToken}`;

  try {
    await sendOrgInviteEmail(normalizedEmail, org.name, acceptUrl);
  } catch (err) {
    console.error("Failed to send org invite email", err);
  }

  res.status(201).json({ member: { id: membership._id, email: membership.email, role: membership.role, status: membership.status } });
});

router.post("/invite/accept", requireAuth, async (req: AuthRequest, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    return res.status(400).json({ error: "token is required" });
  }

  const membership = await Membership.findOne({
    inviteTokenHash: hashToken(token),
    inviteExpires: { $gt: new Date() },
    status: "invited",
  }).select("+inviteTokenHash +inviteExpires");

  if (!membership) {
    return res.status(400).json({ error: "This invitation is invalid or has expired" });
  }

  const user = await User.findById(req.userId).select("email");
  if (!user || user.email.toLowerCase() !== membership.email) {
    return res.status(403).json({ error: "This invitation was sent to a different email address" });
  }

  membership.userId = user._id;
  membership.status = "active";
  membership.inviteTokenHash = null;
  membership.inviteExpires = null;
  await membership.save();

  const org = await Organization.findById(membership.organizationId);
  const newToken = signToken({ userId: user._id.toString(), orgId: membership.organizationId.toString() });

  res.json({
    token: newToken,
    organization: { id: org!._id, name: org!.name, plan: org!.plan },
    role: membership.role,
  });
});

router.post("/switch", requireAuth, async (req: AuthRequest, res: Response) => {
  const { organizationId } = req.body as { organizationId?: string };
  if (!organizationId) {
    return res.status(400).json({ error: "organizationId is required" });
  }

  const membership = await Membership.findOne({ organizationId, userId: req.userId, status: "active" });
  if (!membership) {
    return res.status(403).json({ error: "You're not a member of that organization" });
  }

  const org = await Organization.findById(organizationId);
  const newToken = signToken({ userId: req.userId!, orgId: organizationId });

  res.json({
    token: newToken,
    organization: { id: org!._id, name: org!.name, plan: org!.plan },
    role: membership.role,
  });
});

router.delete("/members/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.orgRole !== "owner") {
    return res.status(403).json({ error: "Only the organization owner can remove members" });
  }

  const membership = await Membership.findOne({ _id: req.params.id, organizationId: req.orgId });
  if (!membership) {
    return res.status(404).json({ error: "Member not found" });
  }
  if (membership.role === "owner") {
    return res.status(400).json({ error: "The organization owner can't be removed" });
  }

  await membership.deleteOne();
  res.status(204).send();
});

router.put("/:id/plan", requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { plan } = req.body as { plan?: string };
  if (plan !== "community" && plan !== "business") {
    return res.status(400).json({ error: 'plan must be "community" or "business"' });
  }

  const org = await Organization.findById(req.params.id);
  if (!org) {
    return res.status(404).json({ error: "Organization not found" });
  }

  org.plan = plan;
  await org.save();

  res.json({ organization: { id: org._id, name: org.name, plan: org.plan } });
});

export default router;
