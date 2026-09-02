import express from "express";
import User from "../model/users.js";
import { hashed, matched } from "../model/hash.js";
import { protect } from "../middleware/auth.js";
import jwt from "jsonwebtoken";

const router = express.Router();


router.get("/profile", protect, async (req, res) => {
    res.status(200).json({
        user: req.user
    });
});


router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    try {
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Please fill all the fields",
            });
        }

        const exist = await User.findOne({ email });

        if (exist) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        const passwordHash = await hashed(password);

        await User.create({
            username,
            email,
            password: passwordHash,
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


router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({
                message: "Please fill all the fields",
            });
        }

        const user = await User.findOne({ email });

        if (!user || !(await matched(password, user.password))) {
            return res.status(401).json({
                message: "Invalid credentials",
            });
        }

        
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Welcome back",
            token
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            message: "Server error",
        });
    }
});

export default router;