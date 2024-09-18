import asyncHandler from "../utils/AsyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // Get the token from cookies or the Authorization header
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "").trim();
        
        // Log the token for debugging
        console.log(token);
        
        // Check if the token is present
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        // Verify the token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Find the user associated with the token
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        // If no user is found, throw an error
        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        // Attach the user to the request object
        req.user = user;
        
        // Call the next middleware
        next();
    } catch (error) {
        // Handle errors, making sure to return a proper response
        next(new ApiError(401, error?.message || "Invalid access token"));
    }
});
