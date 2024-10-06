import { Router } from "express";
import {  loginUser, 
    logoutUser, 
    refereshAcessToken, 
    registerUser, 
    ChnageCurrentPassword ,
    getCurrentUser , 
    updateAccountDetails , 
    updateUserAvatar,
    updateUserCoverImg,
    getUserChannelProfile,
    getWatchHistory 
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avtar",
            maxCount:1
        },
        {
            name:"coverimg",
            maxCount:1
        }
    ]),
    registerUser);
router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refeshToken").post(refereshAcessToken)
router.route("/change-password").post(verifyJWT,ChnageCurrentPassword)
router.route("/current-user").post(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)
router.route("/avtar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-img").patch(verifyJWT, upload.single("coverImage"),updateUserCoverImg)
router.route("/c/:username").get(verifyJWT,getUserChannelProfile);
router.route("/histroy").get(verifyJWT,getWatchHistory);

export default router;
