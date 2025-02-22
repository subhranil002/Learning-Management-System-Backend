import { Resend } from "resend";
import constants from "../constants.js";

const resend = new Resend(constants.RESEND_API_KEY);

export default resend;