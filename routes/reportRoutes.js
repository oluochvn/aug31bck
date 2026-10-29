import express from "express";
import mongoose from "mongoose";
import Transaction from "../model/Transaction.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/reports", protect, async (req, res) => {
  try {
    const months = Math.min(Math.max(parseInt(req.query.months) || 6, 1), 12);
    const userId = new mongoose.Types.ObjectId(req.userId);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const match = { user: userId, date: { $gte: start } };

    const [monthly, categories] = await Promise.all([
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: { y: { $year: "$date" }, m: { $month: "$date" }, type: "$type" },
            total: { $sum: "$amount" },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { ...match, type: "expense" } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const series = Array.from({ length: months }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const find = (type) =>
        monthly.find((r) => r._id.y === y && r._id.m === m && r._id.type === type)
          ?.total || 0;

      return {
        label: d.toLocaleString("en-US", { month: "short" }),
        year: y,
        income: find("income"),
        expenses: find("expense"),
      };
    });

    res.json({
      months: series,
      categories: categories.map((c) => ({ category: c._id, total: c.total })),
      income: series.reduce((sum, s) => sum + s.income, 0),
      expenses: series.reduce((sum, s) => sum + s.expenses, 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;