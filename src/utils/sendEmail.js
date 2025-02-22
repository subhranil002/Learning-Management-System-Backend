import { resend } from "../config/index.js";

const sendEmail = async function (email, subject, message) {
    await resend.emails.send({
        from: "Learning Management System  <onboarding@resend.dev>",
        to: email,
        subject: subject,
        html: message
    });
};

export default sendEmail;
