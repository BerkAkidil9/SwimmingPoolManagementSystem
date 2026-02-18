/**
 * E-posta gönderimi - Render free tier SMTP engellendiği için Resend API kullanır.
 * RESEND_API_KEY set ise Resend (HTTP API), yoksa nodemailer (lokal).
 */
const nodemailer = require("nodemailer");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Swim Center <onboarding@resend.dev>";

let resendClient = null;
let nodemailerTransporter = null;

function getResend() {
  if (!resendClient && RESEND_API_KEY) {
    const { Resend } = require("resend");
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

function getNodemailer() {
  if (!nodemailerTransporter) {
    nodemailerTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return nodemailerTransporter;
}

/**
 * E-posta gönder. Resend varsa onu kullan (Render'da çalışır), yoksa nodemailer.
 */
async function sendEmail({ to, subject, html, from }) {
  const fromAddr = from || EMAIL_FROM;
  const resend = getResend();
  const usingResend = !!resend;
  console.log("[sendEmail] Provider:", usingResend ? "Resend" : "Nodemailer (RESEND_API_KEY missing?)");
  if (resend) {
    const { data, error } = await resend.emails.send({
      from: fromAddr,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    if (error) throw new Error(error.message || "Resend error");
    return data;
  }
  const transporter = getNodemailer();
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error("Email not configured. Set RESEND_API_KEY (recommended) or EMAIL_USER+EMAIL_PASSWORD.");
  }
  await transporter.sendMail({
    from: fromAddr || process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
  return { ok: true };
}

module.exports = { sendEmail };
