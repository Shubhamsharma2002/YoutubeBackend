import express from 'express';
import cors from'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
const server = express();


server.use(cors({
    origin:process.env.CORS_ORIGIN,
    Credential:true
}));

server.use(express.json());
server.use(express.urlencoded());
server.use(express.static("public"));
server.use(cookieParser());

export  {server};