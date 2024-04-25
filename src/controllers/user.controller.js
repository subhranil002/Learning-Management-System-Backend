import User from "../models/user.model.js";
import AppError from "../utils/error.util.js";
import cloudinary from "cloudinary";
import fs from "fs/promises";

const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
};

const register = async (req, res, next) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            fs.rm(`./uploads/${req.file.filename}`);
            return next(new AppError("All fields are required", 400));
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            fs.rm(`./uploads/${req.file.filename}`);
            return next(new AppError("Email already exists", 400));
        }

        const user = await User.create({
            fullName,
            email,
            password,
            avtar: {
                public_id: email,
                secure_url:
                    "https://res.cloudinary.com/dznnpy9yz/image/upload/v1700418495/lms/rrqlbctqrxtnlahelqfc.jpg",
            },
        });

        if (!user) {
            fs.rm(`./uploads/${req.file.filename}`);
            return next(
                new AppError("User registration failed, please try again", 400)
            );
        }

        if (req.file) {
            try {
                const result = await cloudinary.v2.uploader.upload(
                    req.file.path,
                    {
                        folder: "lms",
                        width: 250,
                        height: 250,
                        gravity: "faces",
                        crop: "fill",
                        resource_type: "image",
                    }
                );

                fs.rm(`./uploads/${req.file.filename}`);

                if (result) {
                    user.avtar.public_id = result.public_id;
                    user.avtar.secure_url = result.secure_url;
                }
            } catch (error) {
                fs.rm(`./uploads/${req.file.filename}`);
                return next(
                    new AppError(
                        error.message || "File not uploaded, please try again",
                        500
                    )
                );
            }
        }

        const token = await user.generateJWTToken;

        res.cookie("token", token, cookieOptions);

        await user.save();

        user.password = undefined;

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user,
        });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new AppError("All fields are required", 400));
        }

        const user = await User.findOne({ email }).select("+password");

        if (!user || !user.comparePassword(password)) {
            return next(new AppError("Email or Password does not match", 400));
        }

        const token = await user.generateJWTToken();

        user.password = undefined;

        res.cookie("token", token, cookieOptions);

        res.status(200).json({
            success: true,
            message: "User logged in successfully",
            user,
        });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};

const logout = (req, res) => {
    try {
        res.cookie("token", null, {
            secure: true,
            maxAge: 0,
            httpOnly: true,
        });

        res.status(200).json({
            success: true,
            message: "User logged out successfully",
        });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};

const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);

        res.status(200).json({
            success: true,
            message: "User details",
            user,
        });
    } catch (error) {
        return next(new AppError("Failed to fetch user details", 400));
    }
};