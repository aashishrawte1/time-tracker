import { Router, Response } from "express";
import { TimeEntry } from "../models/TimeEntry";
import { Project } from "../models/Project";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/active", async (req: AuthRequest, res: Response) => {
  const active = await TimeEntry.find({ userId: req.userId, endTime: null }).populate("projectId", "name color");
  res.json({ entries: active });
});

router.post("/start", async (req: AuthRequest, res: Response) => {
  const { projectId } = req.body as { projectId?: string };
  if (!projectId) {
    return res.status(400).json({ error: "projectId is required" });
  }

  const project = await Project.findOne({ _id: projectId, userId: req.userId });
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  const alreadyActive = await TimeEntry.findOne({ userId: req.userId, projectId: project._id, endTime: null });
  if (alreadyActive) {
    return res.status(409).json({ error: "A timer is already running for this project." });
  }

  const entry = await TimeEntry.create({
    userId: req.userId,
    projectId: project._id,
    startTime: new Date(),
    endTime: null,
    durationSeconds: 0,
    source: "timer",
  });

  res.status(201).json({ entry });
});

router.post("/stop", async (req: AuthRequest, res: Response) => {
  const { entryId, note, endTime: requestedEndTime } = req.body as {
    entryId?: string;
    note?: string;
    endTime?: string;
  };

  const filter: Record<string, unknown> = { userId: req.userId, endTime: null };
  if (entryId) filter._id = entryId;

  const active = entryId ? await TimeEntry.findOne(filter) : await TimeEntry.findOne(filter).sort({ startTime: -1 });
  if (!active) {
    return res.status(409).json({ error: "No timer is currently running" });
  }

  // Prefer the client-captured stop moment (e.g. from a retried request after a
  // crash/reconnect) over "now", so a delayed retry doesn't inflate the duration.
  const parsedEndTime = requestedEndTime ? new Date(requestedEndTime) : null;
  const endTime = parsedEndTime && !isNaN(parsedEndTime.getTime()) ? parsedEndTime : new Date();
  active.endTime = endTime;
  active.durationSeconds = Math.max(0, Math.round((endTime.getTime() - active.startTime.getTime()) / 1000));
  if (note !== undefined) active.note = note;
  await active.save();

  res.json({ entry: active });
});

export default router;
