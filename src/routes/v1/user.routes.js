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

userRoutes.post("/register", register);
userRoutes.post("/login", login);
userRoutes.get("/logout", isLoggedIn, logout);
userRoutes.get("/refresh-token", refreshAccessToken);
userRoutes.post(
    "/change-avatar",
    isLoggedIn,
    upload.single("avatar"),
    changeAvatar
);
userRoutes.get("/", isLoggedIn, getProfile);
userRoutes.post("/forgot-password", forgotPassword);
userRoutes.post("/reset-password", resetPassword);
userRoutes.post("/change-password", isLoggedIn, changePassword);
userRoutes.post("/update", isLoggedIn, updateUser);

export default userRoutes;
