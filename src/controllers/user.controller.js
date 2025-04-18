import constants from "../constants.js";
import { Payment, User } from "../models/index.js";
import { Course } from "../models/index.js";
import {
    ApiError,
    ApiResponse,
    asyncHandler,
    sendEmail,
    fileHandler,
    generateAccessAndRefreshToken,
} from "../utils/index.js";
import crypto from "crypto";
import { isBefore } from "date-fns";

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

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(user);

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        }).cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });

        user.password = undefined;

        return res
            .status(201)
            .json(new ApiResponse("User registered successfully", user));
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

        if (!user || !(await user.isPasswordCorrect(password))) {
            throw new ApiError("Invalid email or password", 401);
        }

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(user);

        user.refreshToken = refreshToken;
        await user.save();

        user.refreshToken = undefined;
        user.password = undefined;

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        }).cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });

        return res
            .status(200)
            .json(new ApiResponse("Logged in successfully", user));
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: login: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const guestLogin = asyncHandler(async (req, res, next) => {
    try {
        const user = await User.findById(constants.GUEST_ID);

        const { accessToken } = await generateAccessAndRefreshToken(user);

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });

        return res
            .status(200)
            .json(new ApiResponse("Logged in successfully", user));
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: login: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const logout = asyncHandler(async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        user.refreshToken = undefined;
        await user.save();

        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            path: "/",
        }).clearCookie("refreshToken", {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            path: "/",
        });

        return res
            .status(200)
            .json(new ApiResponse("User logged out successfully"));
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: logout: ${error}`,
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
            throw new ApiError("No avatar file provided", 400);
        }

        // Find current user
        const user = await User.findById(req.user._id).select("avatar");
        if (!user) {
            throw new ApiError("Unauthorized request, please login again", 403);
        }

        // Upload avatar to Cloudinary
        const newAvatar = await fileHandler.uploadImageToCloud(avatarLocalPath);
        if (!newAvatar.public_id || !newAvatar.secure_url) {
            throw new ApiError("Error uploading avatar", 400);
        }

        // Delete old avatar
        const result = await fileHandler.deleteCloudFile(
            user?.avatar?.public_id
        );
        if (!result) {
            await fileHandler.deleteCloudFile(newAvatar.public_id);
            throw new ApiError("Error deleting old avatar", 400);
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
        await fileHandler.deleteLocalFiles();
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
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new ApiError("User not found", 404);
        }

        if (
            user.subscription.status === "active" &&
            isBefore(user.subscription.expiresOn, new Date())
        ) {
            user.subscription.status = "completed";
            user.subscription.expiresOn = null;
            user.subscription.id = null;
            await user.save();
        }

        return res.status(200).json(new ApiResponse("User profile", req.user));
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
        const resetPasswordUrl = `${process.env.FRONTEND_URL}/resetpassword/${resetToken}`;
        const subject = "Password Reset Request";
        const message = `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
    </head>
    <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif">
        <div style="max-width: 600px; margin: 0 auto">
            <div style="background: #ffffff; padding: 30px; border-radius: 8px">
                <h2 style="color: #1a1a1a; margin-bottom: 25px">
                    Password Reset Request
                </h2>
                <p style="color: #333; line-height: 1.6">
                    We received a request to reset your password. Click the
                    button below to set up a new password for your account:
                </p>
                <div style="text-align: center; margin: 30px 0">
                    <a
                        href=${resetPasswordUrl}
                        style="
                            background-color: #2563eb;
                            color: #ffffff;
                            padding: 12px 24px;
                            border-radius: 6px;
                            text-decoration: none;
                            font-size: 16px;
                            display: inline-block;
                        "
                    >
                        Reset Password
                    </a>
                </div>
                <div
                    style="
                        margin-top: 25px;
                        padding-top: 15px;
                        border-top: 1px solid #eee;
                        color: #666;
                        font-size: 0.9em;
                    "
                >
                    <p style="margin: 5px 0">
                        <strong>Security note:</strong> This link will expire in
                        15 Minutes. If you didn't request this password reset,
                        please ignore this email or contact our support team
                        immediately.
                    </p>
                </div>
                <div
                    style="
                        text-align: center;
                        margin-top: 20px;
                        color: #666;
                        font-size: 0.85em;
                    "
                >
                    <p>
                        Need help?
                        <a
                            href=${constants.FRONTEND_URL}/contact
                            style="color: #3498db; text-decoration: none"
                        >
                            Contact Support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    </body>
</html>
        `;
        await sendEmail(email, subject, message);
        await User.findByIdAndUpdate(user._id, {
            forgotPasswordToken,
            forgotPasswordExpiry,
        });

        return res.status(200).json({
            success: true,
            message: `Reset password link has been sent to ${email} successfully`,
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

        return res
            .status(200)
            .json(new ApiResponse("Password reset successfully"));
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
        if (!(await user.isPasswordCorrect(oldPassword))) {
            throw new ApiError("Incorrect credentials", 401);
        }

        user.password = newPassword;
        await user.save();

        return res
            .status(200)
            .json(new ApiResponse("Password changed successfully"));
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

        return res
            .status(200)
            .json(new ApiResponse("User updated successfully", user));
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: updateUser: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const contactUs = asyncHandler(async (req, res, next) => {
    try {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
            throw new ApiError("All fields are required", 400);
        }

        const mailMessage = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 20px auto; color: #333;">
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #2d3436; border-bottom: 2px solid #0984e3; padding-bottom: 10px; margin-bottom: 25px;">
            📬 New Contact Message
        </h2>
        
        <div style="margin-bottom: 25px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <span style="width: 80px; color: #0984e3; font-weight: 500; font-size: 16px;">👤 Name:</span>
                <span style="font-size: 16px;">${name}</span>
            </div>
            
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <span style="width: 80px; color: #0984e3; font-weight: 500; font-size: 16px;">📧 Email:</span>
                <span style="font-size: 16px;">${email}</span>
            </div>
            
            <div style="margin-top: 25px;">
                <h3 style="color: #0984e3; margin-bottom: 15px; ">✉️ Message:</h3>
                <p style="background: #ffffff; padding: 15px; border-radius: 8px; line-height: 1.6; 
                    border: 1px solid #eee;">
                    ${message}
                </p>
            </div>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <div style="text-align: center; color: #666; font-size: 14px;">
            <p>This message was sent from the contact form at <strong>BrainXcel</strong></p>
            <p style="margin-top: 10px;">🕒 Received at: ${new Date().toLocaleString(
                "en-IN",
                { timeZone: "Asia/Kolkata" }
            )}</p>
        </div>
        </div>
    
            <div style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
            <p>© ${new Date().getFullYear()} BrainXcel. All rights reserved.</p>
        </div>
        </div>
        `;

        await sendEmail(
            constants.ADMIN_EMAIL,
            "BrainXcel : Contact Us",
            mailMessage
        );

        return res
            .status(200)
            .json(new ApiResponse("Message sent successfully"));
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: contactUs: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const getMyCourses = asyncHandler(async (req, res, next) => {
    try {
        const courses = await Course.find({
            _id: { $in: req.user.coursesPurchased },
        });
        if (!courses || courses.length === 0) {
            return res
                .status(200)
                .json(new ApiResponse("You have not purchased any course yet"));
        }

        return res
            .status(200)
            .json(new ApiResponse("My Courses fetched successfully", courses));
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: getMyCourses: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const getMyPurchases = asyncHandler(async (req, res, next) => {
    try {
        const purchases = await Payment.aggregate([
            {
                $match: {
                    purchasedBy: req.user._id,
                },
            },
            {
                $lookup: {
                    from: "courses",
                    localField: "coursePurchase.courseId",
                    foreignField: "_id",
                    as: "courseDetails",
                },
            },
            {
                $addFields: {
                    "coursePurchase.courseTitle": {
                        $arrayElemAt: ["$courseDetails.title", 0],
                    },
                },
            },
            {
                $project: {
                    courseDetails: 0,
                    "coursePurchase.courseId": 0,
                },
            },
            {
                $sort: { createdAt: -1 },
            },
        ]);
        if (!purchases || purchases.length === 0) {
            return res
                .status(200)
                .json(new ApiResponse("You have not made any purchase yet"));
        }

        return res
            .status(200)
            .json(
                new ApiResponse("My Purchases fetched successfully", purchases)
            );
    } catch (error) {
        return next(
            new ApiError(
                `user.controller :: getMyCourses: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

export {
    register,
    login,
    guestLogin,
    logout,
    changeAvatar,
    getProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    updateUser,
    contactUs,
    getMyCourses,
    getMyPurchases,
};
