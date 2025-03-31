import constants from "../constants.js";
import { User, Payment } from "../models/index.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/index.js";
import { razorpayInstance } from "../config/index.js";
import crypto from "crypto";
import { addDays, endOfDay } from "date-fns";
import { ObjectId } from "mongodb";

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
        if (user.role === "TEACHER" || user.role === "ADMIN") {
            throw new ApiError(
                "Teachers and admins are not allowed to purchase a subscription",
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

const createOrder = asyncHandler(async (req, res, next) => {
    try {
        const { amount, currency, courseId } = req.body;
        if (!amount || !currency || !courseId) {
            throw new ApiError("All fields are required", 400);
        }
        const options = {
            amount: amount * 100,
            currency,
        };

        const user = await User.findById(req.user._id);
        if (user.role === "TEACHER" || user.role === "ADMIN") {
            throw new ApiError(
                "Teachers and admins cannot purchase a course",
                403
            );
        }

        const alreadyPaid = user.coursesPurchased.find(
            (course) => course.toString() === courseId
        );
        if (alreadyPaid) {
            throw new ApiError("Payment already verified", 400);
        }

        const order = await razorpayInstance.orders
            .create(options)
            .catch((err) => {
                throw new ApiError(`Failed to create order: ${err}`, 400);
            });

        return res.status(200).json(
            new ApiResponse("Payment created successfully", {
                razorpay_order_id: order.id,
                amount,
                currency,
                status: order.status,
            })
        );
    } catch (error) {
        return next(
            new ApiError(
                `payment.controller :: createOrder: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const verifySubscription = asyncHandler(async (req, res, next) => {
    try {
        const { razorpay_payment_id, razorpay_signature, amount, currency } =
            req.body;
        if (
            !razorpay_payment_id ||
            !razorpay_signature ||
            !amount ||
            !currency
        ) {
            throw new ApiError("All fields are required", 400);
        }

        if (req.user.subscription.status === "active") {
            throw new ApiError("User already has an active subscription", 400);
        }

        const user = await User.findById(req.user._id);
        if (user.role === "TEACHER" || user.role === "ADMIN") {
            throw new ApiError(
                "Teachers and admins cannot purchase a subscription",
                403
            );
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
            amount,
            currency,
            purchasedBy: req.user._id,
            coursePurchase: {
                isPurchased: false,
            },
            subscriptionPurchase: true,
        });

        user.subscription.status = "active";
        const expiryDate = endOfDay(
            addDays(
                new Date(),
                Number(constants.RAZORPAY_PLAN_DURATION_IN_DAYS)
            )
        );
        user.subscription.expiresOn = expiryDate;
        user.subscription.expiresOn = await user.save();

        res.status(200).json(
            new ApiResponse("Subscription verified successfully")
        );
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
        if (user.role === "TEACHER" || user.role === "ADMIN") {
            throw new ApiError(
                "Teachers and admins cannot purchase a subscription",
                400
            );
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
        user.subscription.expiresOn = null;
        user.subscription.id = null;
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

const verifyPayment = asyncHandler(async (req, res, next) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            amount,
            currency,
            courseId,
        } = req.body;
        if (
            !razorpay_payment_id ||
            !razorpay_order_id ||
            !razorpay_signature ||
            !amount ||
            !currency
        ) {
            throw new ApiError("All fields are required", 400);
        }

        const user = await User.findById(req.user._id);
        if (user.role === "TEACHER" || user.role === "ADMIN") {
            throw new ApiError(
                "Teachers and admins cannot purchase a course",
                403
            );
        }

        const alreadyPaid = user.coursesPurchased.find(
            (course) => course.toString() === courseId
        );
        if (alreadyPaid) {
            throw new ApiError("Payment already verified", 400);
        }

        const generatedSignature = crypto
            .createHmac("sha256", constants.RAZORPAY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            throw new ApiError("Payment not verified, please try again", 400);
        }

        await Payment.create({
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            amount,
            currency,
            purchasedBy: req.user._id,
            coursePurchase: {
                isPurchased: true,
                courseId,
            },
            subscriptionPurchase: false,
        });

        user.coursesPurchased.push(courseId);
        await user.save();

        res.status(200).json(new ApiResponse("Payment verified successfully"));
    } catch (error) {
        return next(
            new ApiError(
                `payment.controller :: verifyPayment :: ${error}`,
                error.statusCode
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
    createOrder,
    verifySubscription,
    cancelSubscription,
    verifyPayment,
    allPayments,
};
