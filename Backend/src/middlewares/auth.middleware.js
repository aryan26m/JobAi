const jwt=require('jsonwebtoken');
const tokenBlackListModel = require('../models/tokenBlackList.model');

async function authMiddleware(req,res,next){
    const token=req.cookies.token;
    if(!token){
        return res.status(401).json({message:"Unauthorized"});
    }
    const isBlackListed=await tokenBlackListModel.findOne({token});
    if(isBlackListed){
        return res.status(401).json({message:"Unauthorized"});
    }
    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        req.user=decoded;
        next();
    }catch(error){
        return res.status(401).json({message:"Unauthorized"});
    }
}

module.exports={authMiddleware};