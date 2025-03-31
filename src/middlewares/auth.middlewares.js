import jwt from "jsonwebtoken";
import { ApiError } from "../utils/index.js";
import constants from "../constants.js";
import { User } from "../models/index.js";

const isLoggedIn = async (req, res, next) => {
    try {
        // Get access token from request
        const { accessToken } = req.cookies;
        if (!accessToken) {
            throw new ApiError("Access token not found", 401);
        }

        // Check if access token is valid
        const decodedAccessToken = jwt.verify(
            accessToken,
            constants.ACCESS_TOKEN_SECRET,
            (err, decoded) => {
                if (err) {
                    throw new ApiError("Access token is expired", 403);
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
