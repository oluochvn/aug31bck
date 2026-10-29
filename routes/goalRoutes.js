import express from "express";
import mongoose from "mongoose";
import Goal from "../model/Goal.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/goals", protect, async (req, res) => {
  try {
    const goals = await Goal.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/goals", protect, async (req, res) => {
  try {
    const { name, targetAmount } = req.body;
    const target = Number(targetAmount);

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Please add a goal name" });
    }
    if (!Number.isFinite(target) || target <= 0) {
      return res
        .status(400)
        .json({ message: "Target must be a number greater than 0" });
    }

    const goal = await Goal.create({
      user: req.userId,
      name,
      targetAmount: target,
    });

    res.status(201).json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/goals/:id/deposit", protect, async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Goal not found" });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a number greater than 0" });
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $inc: { savedAmount: amount } },
      { new: true }
    );

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/goals/:id", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const { name, targetAmount } = req.body;
    const target = Number(targetAmount);

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Please add a goal name" });
    }
    if (!Number.isFinite(target) || target <= 0) {
      return res
        .status(400)
        .json({ message: "Target must be a number greater than 0" });
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { name: String(name).trim(), targetAmount: target },
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json(goal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/goals/:id", protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json({ message: "Goal deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;