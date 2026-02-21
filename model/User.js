const mongoose=require("mongoose")

const UserScehma=new mongoose.Schema({
    UserName:{
        type:String,
        required:true,
    },
    Email:{
        type:String,
        unique:true,
        required:true,
    },
    Password:{
        type:String,
        required:true
    }
    
})

const User=mongoose.model("UserInfo",UserScehma);

module.exports=User;