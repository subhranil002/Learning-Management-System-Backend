import constants from "../constants.js";
import { User } from "../models/index.js";
import {
    ApiError,
    ApiResponse,
    asyncHandler,
    sendEmail,
    fileHandler,
    generateAccessAndRefreshToken,
} from "../utils/index.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const register = asyncHandler(async (req, res, next) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            throw new ApiError("All fields are required", 400);
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            throw new ApiError("Email already exists", 400);
        }

        const user = await User.create({
            fullName,
            email,
            password,
        });

        if (!user) {
            throw new ApiError(
                "User registration failed, please try again",
                500
            );
        }

        await user.save();

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(user);

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
        }).cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
        });

        user.password = undefined;

        res.status(201).json(
            new ApiResponse("User registered successfully", user)
        );
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: register: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const login = asyncHandler(async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new ApiError("All fields are required", 400);
        }

        const user = await User.findOne({ email }).select("+password");

        if (!user || !user.isPasswordCorrect(password)) {
            throw new ApiError("Invalid email or password", 401);
        }

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(user);

        user.password = undefined;

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
        }).cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
        });

        res.status(200).json(
            new ApiResponse("User logged in successfully", user)
        );
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: login: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const logout = (req, res) => {
    try {
        res.cookie("accessToken", "", {
            httpOnly: true,
            secure: true,
            expires: new Date(0),
        }).cookie("refreshToken", "", {
            httpOnly: true,
            secure: true,
            expires: new Date(0),
        });

        res.status(200).json(new ApiResponse("User logged out successfully"));
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: logout: ${error}`,
                error.statusCode || 500
            )
        );
    }
};

const refreshAccessToken = asyncHandler(async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            throw new ApiError("Refresh token not found", 401);
        }

        const decodedRefreshToken = await jwt.verify(
            refreshToken,
            constants.REFRESH_TOKEN_SECRET,
            (err, decoded) => {
                if (err) {
                    throw new ApiError("Refresh token is expired", 403);
                }
                return decoded;
            }
        );

        const user = await User.findById(decodedRefreshToken?._id);
        if (!user) {
            throw new ApiError("User not found", 401);
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessAndRefreshToken(user);

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
        }).cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
        });

        res.status(200).json(
            new ApiResponse("Access token refreshed successfully")
        );
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: refreshAccessToken: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const changeAvatar = asyncHandler(async (req, res, next) => {
    try {
        // Get avatar file from request
        const avatarLocalPath = req.file ? req.file.path : "";

        // Check if avatar file is empty
        if (!avatarLocalPath) {
            await fileHandler.deleteLocalFiles();
            throw new ApiError("No avatar file provided", 400);
        }

        // Find current user
        const user = await User.findById(req.user._id).select("avatar");
        if (!user) {
            await fileHandler.deleteLocalFiles();
            throw new ApiError("Unauthorized request, please login again", 403);
        }

        // Delete old avatar
        const result = await fileHandler.deleteCloudImage(
            user?.avatar?.public_id
        );
        if (!result) {
            await fileHandler.deleteLocalFiles();
            throw new ApiError("Error deleting old avatar", 400);
        }

        // Upload avatar to Cloudinary
        const newAvatar = await fileHandler.uploadImageToCloud(avatarLocalPath);
        if (!newAvatar.public_id || !newAvatar.secure_url) {
            await fileHandler.deleteLocalFiles();
            throw new ApiError("Error uploading avatar", 400);
        }

        // Update user with new avatar
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                avatar: {
                    public_id: newAvatar.public_id,
                    secure_url: newAvatar.secure_url,
                },
            },
            { new: true }
        ).select("avatar");

        // Return updated user
        return res
            .status(200)
            .json(new ApiResponse("Avatar changed successfully", updatedUser));
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: changeAvatar: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const getProfile = asyncHandler(async (req, res, next) => {
    try {
        res.status(200).json(new ApiResponse("User profile", req.user));
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: getProfile: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const forgotPassword = asyncHandler(async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            throw new ApiError("Email is required", 400);
        }

        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError("Email not registered", 400);
        }

        const resetToken = crypto.randomBytes(20).toString("hex");
        const forgotPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        const forgotPasswordExpiry = Date.now() + 15 * 60 * 1000;
        const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const subject = "Reset Password";
        const message = `You can reset your password by clicking <a href=${resetPasswordUrl} target="_blank">Reset your password</a>\nIf the above link does not work for some reason then copy paste this link in new tab ${resetPasswordUrl}.\n If you have not requested this, kindly ignore.`;

        await sendEmail(email, subject, message);
        await User.findByIdAndUpdate(user._id, {
            forgotPasswordToken,
            forgotPasswordExpiry,
        });

        res.status(200).json({
            success: true,
            message: `Reset password token has been sent to ${email} successfully`,
        });
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: forgotPassword: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const resetPassword = asyncHandler(async (req, res, next) => {
    try {
        const { resetToken, password } = req.body;
        if (!resetToken || !password) {
            throw new ApiError("All fields are required", 400);
        }

        const forgotPasswordToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        const user = await User.findOne({
            forgotPasswordToken,
            forgotPasswordExpiry: { $gt: Date.now() },
        });
        if (!user) {
            throw new ApiError("Token is invalid or expired", 400);
        }

        user.password = password;
        user.forgotPasswordToken = undefined;
        user.forgotPasswordExpiry = undefined;
        await user.save();

        res.status(200).json(new ApiResponse("Password reset successfully"));
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: resetPassword: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const changePassword = asyncHandler(async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            throw new ApiError("All fields are required", 400);
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!user.isPasswordCorrect(oldPassword)) {
            throw new ApiError("Incorrect credentials", 401);
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json(new ApiResponse("Password changed successfully"));
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: changePassword: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const updateUser = asyncHandler(async (req, res, next) => {
    try {
        const { fullName } = req.body;
        if (!fullName) {
            throw new ApiError("All fields are required", 400);
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            throw new ApiError("User not found", 404);
        }

        user.fullName = fullName;
        await user.save();

        res.status(200).json(
            new ApiResponse("User updated successfully", user)
        );
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: updateUser: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

export {
    register,
    login,
    logout,
    refreshAccessToken,
    changeAvatar,
    getProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    updateUser,
};
