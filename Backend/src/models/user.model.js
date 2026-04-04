const mongoose=require('mongoose');

const userSchema=new mongoose.Schema(
    {
        username:{
            type:String,
            required:[true,'Name is required'],
        unique:[true,'UserName must be unique']
        },
        email:{
            type:String,
            required:[true,'Email is required'],
            unique:[true,'Email must be unique']
        },
        password:{
            type:String,
            required:true
        }
    }
);

const userModel=mongoose.model("user",userSchema);

module.exports=userModel;
