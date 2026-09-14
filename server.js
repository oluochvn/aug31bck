import express from "express";
import cors from "cors"
import mongoose from "mongoose";
import dotenv from "dotenv"
import User from "./db/users.js";
import { hashed, matched } from "./model/hash.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

    mongoose.connect(process.env.MONGODB_URI)
            .then(()=>{
                console.log("connected to the db")
            })
            .catch((err)=>{
                console.log(err)
            });

    app.get("", (req, res) => {
    res.send("Test");
    });
    app.post("/register",async (req,res)=>{
        const {username,email,password} = req.body;
            try{
                if(!username || !email || !password){
                    return res.status(400).json({
                        message:"please fill all the fields",
                    })
                }
                const exist = await User.findOne({$or: [{ email },{ username }]});
                    if(exist){
                        return res.status(400).json({
                            message: "user already exist"
                        })
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
            }
            catch(err){
                console.error(err)
            }
    })
    app.post("/login", async (req, res) => {
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

            res.status(200).json({
                message: "Welcome back",
            });

        } catch (err) {
            console.error(err);

            res.status(500).json({
                message: "Server error",
            });
        }
    });


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});