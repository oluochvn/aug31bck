import express from "express";
import cors from "cors"
import mongoose from "mongoose";
const app = express();
app.use(cors({

}));

app.get("", (req, res) => {
  res.send("Test");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});