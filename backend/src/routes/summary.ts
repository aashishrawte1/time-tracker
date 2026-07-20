import { Router, Response } from "express";
import { Types } from "mongoose";
import { TimeEntry } from "../models/TimeEntry";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

type Range = "daily" | "weekly" | "monthly";

function getRangeBounds(range: Range, anchor: Date): { start: Date; end: Date } {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (range === "daily") {
    end.setDate(end.getDate() + 1);
  } else if (range === "weekly") {
    // Week starts Monday
    const day = start.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diffToMonday);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
  } else {
    start.setDate(1);
    end.setTime(start.getTime());
    end.setMonth(end.getMonth() + 1);
  }

  return { start, end };
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const { range, date } = req.query as { range?: string; date?: string };
  const validRanges: Range[] = ["daily", "weekly", "monthly"];
  const selectedRange = validRanges.includes(range as Range) ? (range as Range) : "daily";
  const anchor = date ? new Date(date) : new Date();

  if (isNaN(anchor.getTime())) {
    return res.status(400).json({ error: "Invalid date" });
  }

  const { start, end } = getRangeBounds(selectedRange, anchor);

  const results = await TimeEntry.aggregate([
    {
      $match: {
        userId: new Types.ObjectId(req.userId),
        startTime: { $gte: start, $lt: end },
        endTime: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$projectId",
        totalSeconds: { $sum: "$durationSeconds" },
        entryCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "_id",
        foreignField: "_id",
        as: "project",
      },
    },
    { $unwind: "$project" },
    {
      $project: {
        _id: 0,
        projectId: "$_id",
        projectName: "$project.name",
        projectColor: "$project.color",
        totalSeconds: 1,
        entryCount: 1,
      },
    },
    { $sort: { totalSeconds: -1 } },
  ]);

  const totalSeconds = results.reduce((sum, r) => sum + r.totalSeconds, 0);

  res.json({
    range: selectedRange,
    start,
    end,
    totalSeconds,
    projects: results,
  });
});

export default router;
