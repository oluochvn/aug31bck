import express from "express";
import mongoose from "mongoose";
import Transaction from "../model/Transaction.js";
import Goal from "../model/Goal.js";
import User from "../db/users.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();


router.get("/summary", protect, async (req, res) => {
  try {

    const userId = new mongoose.Types.ObjectId(req.userId);

    const [totals, recent, goals, user] = await Promise.all([
      Transaction.aggregate([
        { $match: { user: userId } },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),
      Transaction.find({ user: req.userId }).sort({ date: -1 }).limit(5),
      Goal.find({ user: req.userId }).sort({ createdAt: -1 }),
      User.findById(req.userId).select("username"),
    ]);

    const income = totals.find((t) => t._id === "income")?.total || 0;
    const expenses = totals.find((t) => t._id === "expense")?.total || 0;

    res.json({
      user: { username: user?.username || "" },
      balance: income - expenses,
      income,
      expenses,
      recentTransactions: recent,
      goals,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/transactions", protect, async (req, res) => {
  try {
    const { type, amount, category, note, date } = req.body;

    if (!["income", "expense"].includes(type) || !amount || !category) {
      return res
        .status(400)
        .json({ message: "type, amount and category are required" });
    }

    const transaction = await Transaction.create({
      user: req.userId,
      type,
      amount,
      category,
      note,
      date,
    });

    res.status(201).json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;