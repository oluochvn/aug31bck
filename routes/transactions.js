import express from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.use(auth);

const validate = (body) => {
  const { type, amount, category } = body;
  if (!["income", "expense"].includes(type)) return "Type must be income or expense";
  if (!(Number(amount) > 0)) return "Amount must be greater than 0";
  if (!category || !String(category).trim()) return "Category is required";
  return null;
};

const pick = (body) => ({
  type: body.type,
  amount: Number(body.amount),
  category: String(body.category).trim(),
  note: body.note ? String(body.note).trim() : "",
  date: body.date ? new Date(body.date) : new Date(),
});

router.get("/", async (req, res) => {
  try {
    const items = await Transaction.find({ user: req.userId }).sort({
      date: -1,
      createdAt: -1,
    });
    res.json(items);
  } catch {
    res.status(500).json({ message: "Could not load transactions" });
  }
});

router.post("/", async (req, res) => {
  const problem = validate(req.body);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const tx = await Transaction.create({ ...pick(req.body), user: req.userId });
    res.status(201).json(tx);
  } catch {
    res.status(500).json({ message: "Could not save transaction" });
  }
});

router.put("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  const problem = validate(req.body);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    res.json(tx);
  } catch {
    res.status(500).json({ message: "Could not update transaction" });
  }
});

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const tx = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Could not delete transaction" });
  }
});

export default router;