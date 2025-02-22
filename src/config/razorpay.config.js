import Razorpay from "razorpay";
import constants from "../constants.js";

// Razorpay instance
const razorpayInstance = new Razorpay({
    key_id: constants.RAZORPAY_KEY_ID,
    key_secret: constants.RAZORPAY_SECRET
});

// Check if Razorpay credentials are valid
await razorpayInstance.orders
    .all()
    .catch(() => console.log("Invalid Razorpay Credentials"));

export default razorpayInstance;
