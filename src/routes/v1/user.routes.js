import { Router } from "express";
const userRoutes = Router();
import {
    register,
    login,
    guestLogin,
    logout,
    getProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    updateUser,
    changeAvatar,
    contactUs,
    getMyCourses,
    getMyPurchases,
} from "../../controllers/user.controller.js";
import {
    authorizedRoles,
    isLoggedIn,
} from "../../middlewares/auth.middlewares.js";
import upload from "../../middlewares/multer.middleware.js";

userRoutes.route("/register").post(register);
userRoutes.route("/login").post(login);
userRoutes.route("/guest-login").get(guestLogin);
userRoutes.route("/logout").get(isLoggedIn, logout);
userRoutes
    .route("/change-avatar")
    .post(
        isLoggedIn,
        authorizedRoles("USER", "TEACHER", "ADMIN"),
        upload.single("avatar"),
        changeAvatar
    );
userRoutes.route("/profile").get(isLoggedIn, getProfile);
userRoutes.route("/forgot-password").post(forgotPassword);
userRoutes.route("/reset-password").post(resetPassword);
userRoutes
    .route("/change-password")
    .post(
        isLoggedIn,
        authorizedRoles("USER", "TEACHER", "ADMIN"),
        changePassword
    );
userRoutes
    .route("/update")
    .post(isLoggedIn, authorizedRoles("USER", "TEACHER", "ADMIN"), updateUser);
userRoutes.route("/contact").post(contactUs);
userRoutes
    .route("/getmycourses")
    .get(isLoggedIn, authorizedRoles("USER", "GUEST"), getMyCourses);
userRoutes
    .route("/getmypurchases")
    .get(isLoggedIn, authorizedRoles("USER", "GUEST"), getMyPurchases);

export default userRoutes;
