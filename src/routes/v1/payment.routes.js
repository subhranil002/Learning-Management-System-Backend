import { Router } from "express";
import {
    allPayments,
    buySubscription,
    cancelSubscription,
    getRazorpayApiKey,
    verifySubscription,
} from "../../controllers/payment.controller.js";
import {
    authorizedRoles,
    isLoggedIn,
} from "../../middlewares/auth.middlewares.js";

const paymentRoutes = Router();

paymentRoutes.route("/apikey").get(isLoggedIn, getRazorpayApiKey);
paymentRoutes.route("/subscribe").get(isLoggedIn, buySubscription);
paymentRoutes.route("/verify").post(isLoggedIn, verifySubscription);
paymentRoutes.route("/unsubscribe").get(isLoggedIn, cancelSubscription);
paymentRoutes.route("/").get(isLoggedIn, authorizedRoles("ADMIN"), allPayments);

export default paymentRoutes;
