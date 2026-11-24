import express from "express";
import mongoose from "mongoose";
import Subscription from "../model/Subscription.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const validate = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Subscription details are required";
  }

  if (!body.name || !String(body.name).trim()) {
    return "Subscription name is required";
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Amount must be greater than 0";
  }

  if (!["weekly", "monthly", "quarterly", "yearly"].includes(body.billingCycle)) {
    return "Invalid billing cycle";
  }

  if (
    !body.nextPaymentDate ||
    Number.isNaN(new Date(body.nextPaymentDate).getTime())
  ) {
    return "Next payment date must be valid";
  }

  return null;
};

const pick = (body) => ({
  name: String(body.name).trim(),
  amount: Number(body.amount),
  billingCycle: body.billingCycle,
  nextPaymentDate: new Date(body.nextPaymentDate),
});

router.use(protect);

router.get("/subscriptions", async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      user: req.userId,
    }).sort({ nextPaymentDate: 1 });
    res.json(subscriptions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not load subscriptions" });
  }
});

router.post("/subscriptions", async (req, res) => {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const subscription = await Subscription.create({
      ...pick(req.body),
      user: req.userId,
    });
    res.status(201).json(subscription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not save subscription" });
  }
});

router.put("/subscriptions/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const problem = validate(req.body);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const subscription = await Subscription.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.json(subscription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not update subscription" });
  }
});

router.delete("/subscriptions/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const subscription = await Subscription.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.json({ message: "Subscription deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not delete subscription" });
  }
});

export default router;
