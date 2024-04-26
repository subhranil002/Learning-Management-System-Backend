import { Router } from "express";
const userRoutes = Router();
import {
    register,
    login,
    logout,
} from "../controllers/user.controller.js";
import upload from "../middlewares/multer.middleware.js";

userRoutes.post("/register", upload.single("avatar"), register);
userRoutes.post("/login", login);
userRoutes.delete("/logout", logout);

export default userRoutes;
