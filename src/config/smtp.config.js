import constants from "../constants.js";
import nodemailer from "nodemailer";

// Connecting to SMTP
const smtpTransport = nodemailer.createTransport({
    host: constants.SMTP_HOST,
    port: constants.SMTP_PORT,
    auth: {
        user: constants.SMTP_USERNAME,
        pass: constants.SMTP_PASSWORD
    }
});

export default smtpTransport;