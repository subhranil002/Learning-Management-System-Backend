import constants from "../constants.js";
import { User, Payment } from "../models/index.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/index.js";
import { razorpayInstance } from "../config/index.js";
import crypto from "crypto";

const getRazorpayApiKey = asyncHandler(async (req, res, next) => {
    res.status(200).json(
        new ApiResponse("Api key fetched successfully", {
            key: constants.RAZORPAY_KEY_ID,
        })
    );
});

const buySubscription = asyncHandler(async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (user.role === "ADMIN") {
            throw new ApiError(
                "Admins are not allowed to purchase a subscription",
                403
            );
        }
        if (user.subscription.status === "active") {
            throw new ApiError("User already has an active subscription", 400);
        }

        let subscription;

        try {
            subscription = await razorpayInstance.subscriptions.create({
                plan_id: constants.RAZORPAY_PLAN_ID,
                customer_notify: 1,
                total_count: 12,
            });
        } catch (error) {
            throw new ApiError("Unable to create subscription", 500);
        }

        user.subscription.id = subscription.id;
        user.subscription.status = subscription.status;
        await user.save();

        res.status(200).json(
            new ApiResponse("Subscription created successfully", subscription)
        );
    } catch (error) {
        return next(
            new ApiError(
                `payment.controller :: buySubscription: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const verifySubscription = asyncHandler(async (req, res, next) => {
    try {
        const { razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_payment_id || !razorpay_signature) {
            throw new ApiError("Invalid payment details", 400);
        }

        const alreadyPaid = await Payment.findOne({
            razorpay_payment_id,
        });
        if (alreadyPaid) {
            throw new ApiError("Payment already verified", 400);
        }

        const user = await User.findById(req.user._id);
        if (user.role === "ADMIN") {
            throw new ApiError("Admin cannot purchase a subscription", 403);
        }

        const generatedSignature = crypto
            .createHmac("sha256", constants.RAZORPAY_SECRET)
            .update(`${razorpay_payment_id}|${user.subscription.id}`)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            throw new ApiError("Payment not verified, please try again", 400);
        }

        await Payment.create({
            razorpay_payment_id,
            razorpay_subscription_id: user.subscription.id,
            razorpay_signature,
        });

        user.subscription.status = "active";
        await user.save();

        res.status(200).json(new ApiResponse("Payment verified successfully"));
    } catch (error) {
        return next(
            new ApiError(
                `payment.controller :: verifySubscription: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const cancelSubscription = asyncHandler(async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (user.role === "ADMIN") {
            throw new ApiError("Admin cannot purchase a subscription", 400);
        }
        if (user.subscription.status !== "active") {
            throw new ApiError("User don't have a subscription", 400);
        }

        let cancel;

        try {
            cancel = await razorpayInstance.subscriptions.cancel(
                user.subscription.id
            );
        } catch (error) {
            throw new ApiError("Unable to cancel subscription", 500);
        }

        user.subscription.status = cancel.status;
        await user.save();

        res.status(200).json(
            new ApiResponse("Subscription cancelled successfully")
        );
    } catch (error) {
        return next(
            new ApiError(
                `payment.controller :: cancelSubscription: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const allPayments = asyncHandler(async (req, res, next) => {
    try {
        const { count } = req.query;
        if (count && (isNaN(count) || count <= 0)) {
            throw new ApiError("Count must be a positive number", 400);
        }

        const subscriptions = await razorpayInstance.subscriptions.all({
            count: count || 10,
        });

        res.status(200).json(
            new ApiResponse("Subscriptions fetched successfully", subscriptions)
        );
    } catch (error) {
        return next(
            new ApiError(
                `payment.controller :: allPayments: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

export {
    getRazorpayApiKey,
    buySubscription,
    verifySubscription,
    cancelSubscription,
    allPayments,
};
