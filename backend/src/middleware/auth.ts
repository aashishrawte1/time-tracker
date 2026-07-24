import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { Membership, MembershipRole } from "../models/Membership";

export interface AuthRequest extends Request {
  userId?: string;
  orgId?: string;
  orgRole?: MembershipRole;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = header.slice("Bearer ".length);
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  // Re-checked on every request (not just at sign-in) so a member removed
  // from an org can't keep using a still-valid token issued before removal.
  const membership = await Membership.findOne({
    organizationId: payload.orgId,
    userId: payload.userId,
    status: "active",
  });
  if (!membership) {
    res.status(401).json({ error: "Your access to this organization is no longer valid" });
    return;
  }

  req.userId = payload.userId;
  req.orgId = payload.orgId;
  req.orgRole = membership.role;
  next();
}
