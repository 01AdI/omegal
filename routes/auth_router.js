const express = require("express");
const User = require("../model/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const auth_router = express.Router();

auth_router.post("/register", async (req, res) => {
  try {
    const { UserName, Email, Password } = req.body;

    // basic validation
    if (!UserName || !Email || !Password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // check if user exists
    const existingUser = await User.findOne({ Email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(Password, 10);

    // create new user (IMPORTANT: await)
    const user = await User.create({
      UserName,
      Email,
      Password: hashedPassword
    });

    res.status(201).json({
      message: "User created successfully",
      userId: user._id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error: registration failed"
    });
  }
});

auth_router.post("/login", async (req, res)=>{
    try{
        const {Email, Password}=req.body;
        
        // existing User or not:
        const existingUser=await User.findOne({Email});

        if(!existingUser){
            return res.status(400).json({ message: "Email is incorrect" });
        }
        // compare the password:
        const isMatch=await bcrypt.compare(Password,existingUser.Password);
        if(!isMatch){
            return res.status(400).json({ message: "Password is incorrect" });
        }

        // creating the token:
        const token=jwt.sign({userId: existingUser._id},process.env.JWT_SECRET,{expiresIn:"3d"});
        // send cookies:
        res.cookie("token",token);
        res.json({
            token,
            message:"login succesfully",
            user: {
                id: existingUser._id,
                username: existingUser.UserName,
                email: existingUser.Email
            }
        })

    }catch(err){
        console.log(err);
        res.status(500).json({message:"Server Error login is not happening"});
    }
})

module.exports = auth_router;
