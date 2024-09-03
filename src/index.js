import express from 'express';
import 'dotenv/config';
import connectDB from './db/index.js';
const server = express();
const port = process.env.PORT;

server.listen(port,(req, res)=>{
    console.log(`server is listing on port no ${port}`);
    connectDB();
});
