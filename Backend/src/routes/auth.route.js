const express=require('express');

const authRouter=express.Router();

const AuthController=require("../controllers/auth.controller");
const authMiddlewares=require("../middlewares/auth.middleware");    

// register  user route
authRouter.post("/register",AuthController.registerUser);
//login route
authRouter.post("/login",AuthController.loginUser);
//logout route
authRouter.get("/logout",AuthController.logoutUser);
//getme route
authRouter.get("/get-me",authMiddlewares.authMiddleware,AuthController.getMe);
module.exports=authRouter;