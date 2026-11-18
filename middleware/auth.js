import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../db/users.js";

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not logged in" });
  }

  let decoded;
  try {
    decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Session expired, please log in again" });
  }

  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.id !== "string" ||
    !mongoose.isValidObjectId(decoded.id)
  ) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const user = await User.findById(decoded.id).select(
      "username email role status lastLoginAt"
    );
    if (!user) {
      return res.status(401).json({ message: "Not logged in" });
    }

    req.userId = user._id;
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
};