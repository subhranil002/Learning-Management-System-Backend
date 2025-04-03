import jwt from "jsonwebtoken";
import { ApiError, generateAccessAndRefreshToken } from "../utils/index.js";
import constants from "../constants.js";
import { User } from "../models/index.js";

const refreshAccessToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            throw new ApiError("Refresh token not found", 401);
        }

        const decodedRefreshToken = jwt.verify(
            refreshToken,
            constants.REFRESH_TOKEN_SECRET,
            (err, decoded) => {
                if (err) {
                    throw new ApiError(
                        "Session expired! Please login again",
                        403
                    );
                }
                return decoded;
            }
        );

        const user = await User.findById(decodedRefreshToken?._id);
        if (!user) {
            throw new ApiError("User not found", 401);
        }
        if (user.refreshToken !== refreshToken) {
            throw new ApiError("Session expired! Please login again", 403);
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessAndRefreshToken(user);

        user.refreshToken = newRefreshToken;
        await user.save();
        req.user = user;

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        }).cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });

        next();
    } catch (error) {
        return next(
            new ApiError(
                `auth.middleware :: refreshAccessToken: ${error}`,
                error.statusCode || 500
            )
        );
    }
};

const isLoggedIn = async (req, res, next) => {
    try {
        // Get access token from request
        const { accessToken } = req.cookies;
        if (!accessToken) {
            throw new ApiError("Access token not found", 401);
        }

        // Check if access token is valid
        try {
            const decodedAccessToken = jwt.verify(
                accessToken,
                constants.ACCESS_TOKEN_SECRET,
                (err, decoded) => {
                    if (err) {
                        throw new ApiError("Access token is expired", 401);
                    }
                    return decoded;
                }
            );

            // Check if user is verified
            const user = await User.findById(decodedAccessToken?._id);
            if (!user) {
                throw new ApiError("User not found", 401);
            }

            // Set user in request
            req.user = user;

            next();
        } catch (error) {
            await refreshAccessToken(req, res, next);
        }
    } catch (error) {
        return next(
            new ApiError(
                `auth.middleware :: isLoggedIn: ${error}`,
                error.statusCode || 500
            )
        );
    }
};

const authorizedRoles =
    (...roles) =>
    (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ApiError("You are not authorized to access this route", 403)
            );
        }

        next();
    };

const authorizedUser = async (req, res, next) => {
    const subscription = req.user.subscription;
    const currentUserRole = req.user.role;
    const courseId = req.params.courseId;

    const alreadyPurchased = req.user.coursesPurchased.find(
        (course) => course.toString() === courseId
    );

    if (
        !alreadyPurchased &&
        currentUserRole !== "TEACHER" &&
        currentUserRole !== "ADMIN" &&
        subscription.status !== "active"
    ) {
        return next(new ApiError("Please subscribe to access this route", 400));
    }

    next();
};

export { isLoggedIn, authorizedRoles, authorizedUser };
