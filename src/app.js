import express from 'express';
import cors from'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import router from './routes/user.routes.js';
const server = express();


server.use(cors({
    origin:process.env.CORS_ORIGIN,
    Credential:true
}));

server.use(express.json());
server.use(express.urlencoded());
server.use(express.static("public"));
server.use(cookieParser());


// our router define here
server.use("/api/v1/user", router)
export  {server};