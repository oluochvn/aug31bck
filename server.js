import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "./db/users.js";
import { hashed, matched } from "./model/hash.js";
import { protect, requireAdmin } from "./middleware/auth.js";
import transactionsRoutes from "./routes/transactions.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("connected to the db");
    await Promise.all([
      User.updateMany(
        { role: { $exists: false } },
        { $set: { role: "user" } }
      ),
      User.updateMany(
        { status: { $exists: false } },
        { $set: { status: "approved" } }
      ),
      User.updateMany(
        { lastLoginAt: { $exists: false } },
        { $set: { lastLoginAt: null } }
      ),
    ]);
    console.log("Existing user records updated");
  })
  .catch((err) => {
    console.error("Database connection or user migration failed:", err);
  });

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

app.get("/", (req, res) => {
  res.send("Test");
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "please fill all the fields",
      });
    }

    const exist = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });
    if (exist) {
      return res.status(400).json({
        message: "user already exist",
      });
    }

    const passwordHash = await hashed(password);

    await User.create({
      username,
      email: email.toLowerCase(),
      password: passwordHash,
      role: "user",
      status: "pending",
    });

    res.status(201).json({
      message: "Registered successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        message: "Please fill all the fields",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user || !(await matched(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.status !== "approved") {
      return res.status(403).json({
        message: "Your account is pending approval",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    res.status(200).json({
      message: "Welcome back",
      token: signToken(user._id),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
});

app.use("/transactions", transactionsRoutes);
app.use("/", summaryRoutes);
app.use("/", goalRoutes);
app.use("/", reportRoutes);

app.get("/me", protect, (req, res) => {
  res.json({
    id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
    status: req.user.status,
    lastLoginAt: req.user.lastLoginAt,
  });
});

app.get("/admin/users", protect, requireAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select("username email role status lastLoginAt createdAt updatedAt")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/admin/users", protect, requireAdmin, async (req, res) => {
  const { username, email, password, role = "user" } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }
    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }],
    });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      username,
      email: normalizedEmail,
      password: await hashed(password),
      role,
      status: "approved",
    });
    res.status(201).json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch(
  "/admin/users/:id/approve",
  protect,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { status: "approved" },
        { new: true, runValidators: true }
      ).select("username email role status lastLoginAt");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json(user);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

app.delete("/admin/users/:id", protect, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      user.role === "admin" &&
      (await User.countDocuments({ role: "admin" })) <= 1
    ) {
      return res.status(409).json({ message: "Cannot delete the last admin" });
    }

    await user.deleteOne();
    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});