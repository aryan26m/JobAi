const express=require('express');
const cookieParser = require('cookie-parser');
const app=express();
const cors=require('cors');

const configuredOrigins = [process.env.CLIENT_URL, process.env.FRONTEND_URL]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = [...new Set(["http://localhost:5173", ...configuredOrigins])];

const corsOptions = {
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true
};

//middlewware
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
//routers
//router requires
const authRouter = require("./routes/auth.route");
const interviewRouter=require("./routes/interview.route");

//routers use
app.use("/api/interview",interviewRouter);
app.use("/api/auth",authRouter);
module.exports=app;