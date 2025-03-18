import constants from "../constants.js";
import smtpTransport from "../config/smtp.config.js";
import ApiError from "./ApiError.js";

const sendEmail = async function (email, subject, message) {
    try {
        // Verify connection
        await new Promise((resolve, reject) => {
            smtpTransport.verify((error, success) => {
                if (error) {
                    reject(new ApiError(error, 500));
                } else {
                    resolve();
                }
            });
        });

        // Send email
        const response = await smtpTransport.sendMail({
            from: `BrainXcel <${constants.SMTP_USERNAME}>`,
            to: email,
            subject: subject,
            html: message,
        });

        // return boolean value
        return response.accepted.length > 0 ? true : false;
    } catch (error) {
        throw new ApiError(error, 500);
    }
};

export default sendEmail;
