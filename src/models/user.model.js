import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import constants from "../constants.js";

const userSchema = new Schema(
    {
        fullName: {
            type: "String",
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: "String",
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
            unique: true,
            match: [
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                "Please fill in a valid email address",
            ],
        },
        password: {
            type: "String",
            required: [true, "Password is required"],
            minLength: [8, "Password must be at least 8 characters"],
            select: false,
        },
        avatar: {
            public_id: {
                type: "String",
            },
            secure_url: {
                type: "String",
            },
        },
        role: {
            type: "String",
            enum: ["GUEST", "USER", "TEACHER", "ADMIN"],
            default: "USER",
        },
        forgotPasswordToken: String,
        forgotPasswordExpiry: Date,
        subscription: {
            id: {
                type: String,
                default: "",
            },
            status: {
                type: String,
                enum: [
                    "created",
                    "authenticated",
                    "active",
                    "pending",
                    "halted",
                    "cancelled",
                    "completed",
                    "expired",
                ],
                default: "completed",
            },
            expiresOn: {
                type: Date,
            },
        },
        coursesPurchased: [
            {
                type: Schema.Types.ObjectId,
                ref: "Course",
            },
        ],
        refreshToken: String,
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }

    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods = {
    isPasswordCorrect: async function (plainTextPassword) {
        return await bcrypt.compare(plainTextPassword, this.password);
    },
    generateAccessToken: async function () {
        return jwt.sign(
            {
                _id: this._id,
            },
            constants.ACCESS_TOKEN_SECRET,
            {
                expiresIn: constants.ACCESS_TOKEN_EXPIRE,
            }
        );
    },
    generateRefreshToken: function () {
        return jwt.sign(
            {
                _id: this._id,
            },
            constants.REFRESH_TOKEN_SECRET,
            {
                expiresIn: constants.REFRESH_TOKEN_EXPIRE,
            }
        );
    },
};

const User = model("users", userSchema);
export default User;
