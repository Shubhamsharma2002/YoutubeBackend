import { Router } from "express";
import { hello, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
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

    router.route("/check").get(hello)

export default router;
