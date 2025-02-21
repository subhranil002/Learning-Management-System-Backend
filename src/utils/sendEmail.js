import { Resend } from "resend";
import { config } from "dotenv";
config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async function (email, subject, message) {
    await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: subject,
        html: message
    });
};

export default sendEmail;
