import { model, Schema } from "mongoose";

const paymentSchema = new Schema(
    {
        razorpay_payment_id: {
            type: String,
            required: true,
        },
        razorpay_subscription_id: {
            type: String,
        },
        razorpay_order_id: {
            type: String,
        },
        razorpay_signature: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            required: true,
        },
        purchasedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        coursePurchase: {
            isPurchased: {
                type: Boolean,
                default: false,
            },
            courseId: {
                type: Schema.Types.ObjectId,
                ref: "Course",
            },
        },
        subscriptionPurchase: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["Completed", "Cancelled"],
        },
    },
    {
        timestamps: true,
    }
);

const Payment = model("payments", paymentSchema);

export default Payment;
