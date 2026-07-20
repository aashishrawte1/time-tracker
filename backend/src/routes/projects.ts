import { Router, Response } from "express";
import { Project } from "../models/Project";
import { TimeEntry } from "../models/TimeEntry";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res: Response) => {
  const projects = await Project.find({ userId: req.userId }).sort({ createdAt: 1 });
  res.json({ projects });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { name, color } = req.body as { name?: string; color?: string };
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Project name is required" });
  }

  try {
    const project = await Project.create({
      userId: req.userId,
      name: name.trim(),
      color: color || "#6366f1",
    });
    res.status(201).json({ project });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "You already have a project with this name" });
    }
    throw err;
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const { name, color, archived } = req.body as { name?: string; color?: string; archived?: boolean };

  const project = await Project.findOne({ _id: req.params.id, userId: req.userId });
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  if (name !== undefined) project.name = name.trim();
  if (color !== undefined) project.color = color;
  if (archived !== undefined) project.archived = archived;

  await project.save();
  res.json({ project });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const project = await Project.findOne({ _id: req.params.id, userId: req.userId });
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }

  await TimeEntry.deleteMany({ projectId: project._id, userId: req.userId });
  await project.deleteOne();
  res.status(204).send();
});

export default router;
