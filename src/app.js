import express from "express";
import constants from "./constants.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import errorMiddleware from "./middlewares/error.middleware.js";
import {
    healthCheckRoutes as v1_healthCheckRoutes,
    userRoutes as v1_userRoutes,
    courseRoutes as v1_courseRoutes,
    paymentRoutes as v1_paymentRoutes,
} from "./routes/v1/index.js";

const app = express();

// Middleware
app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    })
);
app.use(
    cors({
        origin: constants.CORS_ORIGIN,
        credentials: true,
    })
);
app.use(cookieParser());
app.use(express.static("public"));
app.use(morgan("dev"));

app.use("/api/v1/health-check", v1_healthCheckRoutes);
app.use("/api/v1/users", v1_userRoutes);
app.use("/api/v1/courses", v1_courseRoutes);
app.use("/api/v1/payments", v1_paymentRoutes);

// Handle 404 errors
app.all("*", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Page not found",
    });
});

// Error handling middleware
app.use(errorMiddleware);

export default app;
