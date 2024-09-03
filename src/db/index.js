import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () =>{
      try {

        await mongoose.connect(`${process.env.URI}/${DB_NAME}`)
        console.log(`databse connect ::)`);
        
      } catch (error) {
        console.log("mongo db connection error");

        
      }
}


export default connectDB;