import { Router } from "express";
const userRoutes = Router();
import {
    register,
    login,
    logout,
    getProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    updateUser,
    refreshAccessToken,
    changeAvatar,
} from "../../controllers/user.controller.js";
import { isLoggedIn } from "../../middlewares/auth.middlewares.js";
import upload from "../../middlewares/multer.middleware.js";

userRoutes.route("/register").post(register);
userRoutes.route("/login").post(login);
userRoutes.route("/logout").get(logout);
userRoutes.route("/refresh-token").get(refreshAccessToken);
userRoutes
    .route("/change-avatar")
    .post(isLoggedIn, upload.single("avatar"), changeAvatar);
userRoutes.route("/profile").get(isLoggedIn, getProfile);
userRoutes.route("/forgot-password").post(forgotPassword);
userRoutes.route("/reset-password").post(resetPassword);
userRoutes.route("/change-password").post(isLoggedIn, changePassword);
userRoutes.route("/update").post(isLoggedIn, updateUser);

export default userRoutes;
