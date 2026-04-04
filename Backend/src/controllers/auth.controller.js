const userModel=require("../models/user.model");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const tokenBlackListModel=require("../models/tokenBlackList.model");
/**
 * @desc Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
async function registerUser(req,res) {
    const {username,email,password}=req.body;
    if(!username || !email || !password){
        return res.status(400).json({message:"All fields are required"});
    }
    const userAlreadyExists=await userModel.findOne({
        $or:[{username},{email}]
    });
    if(userAlreadyExists){
        return res.status(400).json({message:"User with the same username or email already exists"});
    }
       const passwordHash=await bcrypt.hash(password,10);
       const newUser=await userModel.create({
        username,
        email,
        password:passwordHash
       });

       const token = jwt.sign({
        userId: newUser._id,
        username: newUser.username
       },process.env.JWT_SECRET,{expiresIn:"3d"});

       res.cookie("token",token);
         res.status(201).json({
            message:"User registered successfully",
            user:{
                id:newUser._id,
                username:newUser.username,
                email:newUser.email
            }
            });
}


/**
 * @desc Login a user
 * @route POST /api/auth/login
 * @access Public
 */

async function loginUser(req,res){
    const {email,password}=req.body;
    if(!email || !password){
        return res.status(400).json({message:"All fields are required"});
    }
    const user = await userModel.findOne({email});
    if(!user){
        return res.status(400).json({message:"Invalid email or password"});
    }
    const isPasswordValid=await bcrypt.compare(password,user.password);
    if(!isPasswordValid){
        return res.status(400).json({message:"Invalid email or password"});
    }
    const token = jwt.sign({
        userId: user._id,
        username: user.username
       },process.env.JWT_SECRET,{expiresIn:"3d"});

       res.cookie("token",token);
            res.status(200).json({      
            message:"User logged in successfully",
            user:{
                id:user._id,        
                username:user.username,
                email:user.email
            }
        });     
}


/**
 * @desc Logout a user
 * @route POST /api/auth/logout
 * @access Public
 */
async function logoutUser(req,res){
    const token = req.cookies.token;
    if(!token){
        return res.status(400).json({message:"No token found"});
    }
    const tokenBlackList = await tokenBlackListModel.create({token});
    res.clearCookie("token");
    res.status(200).json({message:"User logged out successfully"});
}

/**
 * @desc Get current user details
 * @route GET /api/auth/get-me
 * @access Private
 */
async function getMe(req,res){
    const user = await userModel.findById(req.user.userId).select("-password");
    if(!user){
        return res.status(404).json({message:"User not found"});
    }
    res.status(200).json({user:{
        id:user._id,
        username:user.username,
        email:user.email
    }});
}
module.exports={registerUser,loginUser,logoutUser,getMe};