import { Response, NextFunction } from "express";
import { User } from "../models/User";
import { AuthRequest } from "./auth";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const emails = adminEmails();
  if (emails.length === 0) {
    res.status(403).json({ error: "Admin access is not configured" });
    return;
  }

  const user = await User.findById(req.userId).select("email");
  if (!user || !emails.includes(user.email.toLowerCase())) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}
