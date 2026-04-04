const express=require('express');
const cookieParser = require('cookie-parser');
const app=express();
const cors=require('cors');

//middlewware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}));
//routers
//router requires
const authRouter = require("./routes/auth.route");
const interviewRouter=require("./routes/interview.route");

//routers use
app.use("/api/interview",interviewRouter);
app.use("/api/auth",authRouter);
module.exports=app;