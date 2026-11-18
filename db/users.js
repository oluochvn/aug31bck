import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "approved",
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    currency: {
      type: String,
      default: "KES",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;