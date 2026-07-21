import { Router, Response } from "express";
import { TimeEntry } from "../models/TimeEntry";
import { Project } from "../models/Project";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res: Response) => {
  const { projectId, from, to, limit } = req.query as { projectId?: string; from?: string; to?: string; limit?: string };

  const filter: Record<string, unknown> = { userId: req.userId };
  if (projectId) filter.projectId = projectId;
  if (from || to) {
    const startTime: Record<string, Date> = {};
    if (from) startTime.$gte = new Date(from);
    if (to) startTime.$lte = new Date(to);
    filter.startTime = startTime;
  }

  const entries = await TimeEntry.find(filter)
    .sort({ startTime: -1 })
    .limit(Math.min(Number(limit) || 100, 500))
    .populate("projectId", "name color");

  res.json({ entries });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { projectId, startTime, endTime, note } = req.body as {
    projectId?: string;
    startTime?: string;
    endTime?: string;
    note?: string;
  };

  if (!projectId || !startTime || !endTime) {
    return res.status(400).json({ error: "projectId, startTime and endTime are required" });
  }

  const project = await Project.findOne({ _id: projectId, userId: req.userId });
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: "Invalid startTime or endTime" });
  }
  if (end <= start) {
    return res.status(400).json({ error: "endTime must be after startTime" });
  }

  const entry = await TimeEntry.create({
    userId: req.userId,
    projectId: project._id,
    startTime: start,
    endTime: end,
    durationSeconds: Math.round((end.getTime() - start.getTime()) / 1000),
    note: note ?? "",
  });

  res.status(201).json({ entry });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const entry = await TimeEntry.findOne({ _id: req.params.id, userId: req.userId });
  if (!entry) {
    return res.status(404).json({ error: "Time entry not found" });
  }

  const { startTime, endTime, note } = req.body as { startTime?: string; endTime?: string; note?: string };

  if (startTime !== undefined) entry.startTime = new Date(startTime);
  if (endTime !== undefined) entry.endTime = endTime ? new Date(endTime) : null;
  if (note !== undefined) entry.note = note;

  if (entry.endTime) {
    entry.durationSeconds = Math.max(0, Math.round((entry.endTime.getTime() - entry.startTime.getTime()) / 1000));
  }

  await entry.save();
  res.json({ entry });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const entry = await TimeEntry.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!entry) {
    return res.status(404).json({ error: "Time entry not found" });
  }
  res.status(204).send();
});

export default router;
