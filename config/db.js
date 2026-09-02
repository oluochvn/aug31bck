import mongoose from "mongoose";

export const connectDB = async () =>{
    try{
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log('connected to the database')
    }
    catch(err){
        console.log(err)
        process.exit(1)
    }
}