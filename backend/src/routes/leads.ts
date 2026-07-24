import { Router, Request, Response } from "express";
import { Lead } from "../models/Lead";
import { sendLeadNotificationEmail } from "../utils/email";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { name, email, company, teamSize, message } = req.body as {
    name?: string;
    email?: string;
    company?: string;
    teamSize?: string;
    message?: string;
  };

  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }

  const lead = await Lead.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    company: company?.trim() ?? "",
    teamSize: teamSize?.trim() ?? "",
    message: message?.trim() ?? "",
  });

  const notifyTo = process.env.SALES_NOTIFY_EMAIL;
  if (notifyTo) {
    try {
      await sendLeadNotificationEmail(notifyTo, lead);
    } catch (err) {
      console.error("Failed to send lead notification email", err);
    }
  }

  res.status(201).json({ message: "Thanks — we'll be in touch soon." });
});

router.get("/", requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  const leads = await Lead.find().sort({ createdAt: -1 });
  res.json({ leads });
});

export default router;
