import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () =>{
      try {
    console.log(`${process.env.URI}`);
    
       const connection =  await mongoose.connect(`${process.env.URI}/${DB_NAME}`)
        console.log(`databse connect ::)  ${connection}`);
        
      } catch (error) {
        console.log("mongo db connection error");
        console.log(error);

        
      }
}


export default connectDB;