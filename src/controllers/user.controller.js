import asyncHandler from "../utils/AsyncHandler.js"

import ApiError from "../utils/ApiError.js" 
import{User} from "../models/user.model.js"
import{uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

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


export {registerUser, loginUser, logoutUser}