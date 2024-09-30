import asyncHandler from "../utils/AsyncHandler.js"

import ApiError from "../utils/ApiError.js" 
import{User} from "../models/user.model.js"
import{uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";

const genratteAcessAndRefereshToken = async(userId) =>{
    try {
        
       const user = await User.findById(userId);
       const accessToken = user.genrateAcessToken()
       const refershToken = user.genrateRefershToken()
       user.refershToken = refershToken 
       user.save({validateBeforeSave:false})

       return {accessToken, refershToken}
    } catch (error) {
        throw new ApiError(500, "something went wrong while genrating acess and referesh token");
    }
}
const registerUser = asyncHandler(async(req,res) =>{
   
    //  get user details from frontend
        const {username,email,fullname,password} = req.body;
       
        console.log(req.body);
        
        
    //  validation  - not empty
        
      if([username,email,fullname,password].some((field) => field?.trim() === "")){
           throw new ApiError(400, "All fields are required")
      }
    // check if user is alredy  exists : username, email
    const existedUser =  await User.findOne({
        $or:[{username}, {email}]
    })

    if(existedUser){
        throw new ApiError (409, "User with email or username is alredy exisits");
    }
    // //  check for image , check for avtar
      const avtarLocal = req.files?.avtar[0]?.path;
    //   const coverLocal = req.files?.coverimg[0]?.path;
// checking for coverImg
    let coverLocal;
    if (req.files && Array.isArray(req.files.coverimg) && req.files.coverimg.length > 0) {
        coverLocal = req.files.coverimg[0].path
    }
    // check  to avtar
    if(!avtarLocal){
        throw new ApiError(400,"Avtar is required");
    }


    // // upload to cloudniary
     const avtar = await uploadOnCloudinary(avtarLocal);
     const coverimg = await uploadOnCloudinary(coverLocal);

     if(!avtar){
        throw new ApiError(400,"Avtar is required");
     }
   
    // create the user object - create in db
       const userData = await User.create({
            username : username.toLowerCase(),
            email,
            avtar:  avtar.url,
            coverimg: coverimg?.url || "",
            fullname,
            password
        })

        // check for user creation remove pasword and refferesh token
        const createdUser = await User.findById(userData._id).select(
            "-password -refershToken"
        );
    
    // checking of user
    if(!createdUser){
        throw new ApiError(500,"something went wrong while creating user")
    }

    // return response
     return res.status(201).json(
        new ApiResponse(200, createdUser,"User Register suceesfully")
     )
})


const loginUser = asyncHandler(async(req,res)=>{
    // login based on username || email
    // password
    // acess and refresh token 
    // send cookies

    const {username, email, password} = req.body;

    // if(!(username || email)){
    //     throw new ApiError(400, 'username or email is required');
    // }
    if(!username|| !email){
        if(!username&& !email){
            throw new ApiError(400, 'username or email is required');
        }
    }
    const user = await User.findOne({
        $or:[{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User not found with given data")
    }
   
    const isValidPassword = await user.isPasswordCorrect(password);
    if(!isValidPassword){
        throw new ApiError(401, "Invalid user credentials")
    }
    const {accessToken,refershToken} = await genratteAcessAndRefereshToken(user._id);

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken");
// seting cookies
    const option = {
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .cookie("accessToken", accessToken,option)
    .cookie("refereshToken", refershToken, option)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refershToken
            },
            "user loged in Sucessfully"
        )
    )
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refershToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})


const refereshAcessToken = asyncHandler(async(req,res)=>{
    const incomigRefeshToken = req.cookies.refershToken || req.body.refershToken

    if(!incomigRefeshToken){
        throw new ApiError(401,"Unatuthirized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomigRefeshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await  User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Refersh Token")
        }
    
        if(incomigRefeshToken !== user?.refershToken){
            throw new ApiError(401,"refesh Token is invalid or used")
        }
        const options = {
            httpOnly:true,
            secure:true
        }
    
       const {accessToken,newrefershToken} = await genratteAcessAndRefereshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refershToken",newrefershToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refershToken:newrefershToken},
                "Access token refereshd"
            )
        )
    } catch (error) {
          throw new ApiError(401,"Invalid refershToken")
    }
})


const ChnageCurrentPassword = asyncHandler(async(req,res)=>{
     const {oldPassword , newPassword} = req.body;
     const user = await User.findById(req.user?._id);
     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
     if(!isPasswordCorrect){
        throw new ApiError(400 ,"Password is incorrect");
     }

     user.password = newPassword;
     await user.save({validateBeforeSave:false})
     return res
     .status(200)
     .json(new ApiResponse(200,{} , "Password updated Sucessfully"));
})

const getCurrentUser = asyncHandler(async(req, res)=>{
    return res 
    .status(200)
    .json(

        new ApiResponse(200,req.user , "Current User Fetch Suceefully")
    )
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
   const {fullname,email} = req.body;
   if(!fullname || !email){
    throw new ApiError(400, "All field are required");
   }

   const user = User.findByIdAndUpdate(
    req.user?._id,{
        $set:{
            fullname:fullname,
            email:email
        }
    },{
        new:true
    }
   ).select("-password ")

   return res 
   .status(200)
   .json(
    new ApiResponse(200, user , "Account Details Updated SucessFully")
   )
})


const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocal = req.file?.path;
    if(!avatarLocal){
        throw new ApiError(400, "Avatar file is missing")

    }
    const avtar = await uploadOnCloudinary(avatarLocal);

    if(!avtar.url){
        throw new ApiError(400,"Error while uploading the avatar")
    }

   const data =  await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set:{
                avtar:avtar.url
            }
        },{new:true}
    ).select("-password")

    return res 
   .status(200)
   .json(
    new ApiResponse(200, data , "Avatar Updated SucessFully")
   )
})


const updateUserCoverImg = asyncHandler(async(req,res)=>{
    const coverimgLocal = req.file?.path;
    if(!coverimgLocal){
        throw new ApiError(400, "Avatar file is missing")

    }
    const coverimg = await uploadOnCloudinary(coverimgLocal);

    if(!coverimg.url){
        throw new ApiError(400,"Error while uploading the avatar")
    }

   const data =  await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set:{
                coverimg:coverimg.url
            }
        },{new:true}
    ).select("-password")
    return res 
   .status(200)
   .json(
    new ApiResponse(200, data , "Cover Img Updated SucessFully")
   )
})
export {
    registerUser, 
    loginUser, 
    logoutUser,
    refereshAcessToken,
    ChnageCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImg
}