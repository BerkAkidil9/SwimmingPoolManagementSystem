/**
 * E-posta gönderimi - Render free tier SMTP engellendiği için HTTP tabanlı çözümler kullanır.
 * Öncelik: Gmail API (HTTPS) > Resend API > Nodemailer SMTP (sadece lokal)
 */
const nodemailer = require("nodemailer");
const gmailTransportModule = require("gmail-nodemailer-transport");
const GmailTransport =
  typeof gmailTransportModule === "function"
    ? gmailTransportModule
    : gmailTransportModule.GmailTransport || gmailTransportModule.default;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const EMAIL_FROM =
  process.env.EMAIL_FROM || (GMAIL_USER ? `Swim Center <${GMAIL_USER}>` : "Swim Center <onboarding@resend.dev>");

let resendClient = null;
let gmailTransporter = null;
let nodemailerTransporter = null;

function getGmailTransporter() {
  if (
    !gmailTransporter &&
    GMAIL_USER &&
    GMAIL_REFRESH_TOKEN &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  ) {
    gmailTransporter = nodemailer.createTransport(
      new GmailTransport({
        userId: GMAIL_USER,
        auth: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: GMAIL_REFRESH_TOKEN,
        },
      })
    );
  }
  return gmailTransporter;
}

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
 * E-posta gönder. Öncelik: Gmail API > Resend > Nodemailer SMTP (lokal)
 */
async function sendEmail({ to, subject, html, from }) {
  const fromAddr = from || EMAIL_FROM;
  const gmail = getGmailTransporter();
  const resend = getResend();

  let provider = "none";
  if (gmail) {
    provider = "Gmail API";
  } else if (resend) {
    provider = "Resend";
  } else {
    provider = "Nodemailer SMTP";
  }
  console.log("[sendEmail] Provider:", provider);

  if (gmail) {
    await gmail.sendMail({
      from: fromAddr,
      to,
      subject,
      html,
    });
    return { ok: true };
  }

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
    throw new Error(
      "Email not configured. Set GMAIL_USER+GMAIL_REFRESH_TOKEN (recommended), RESEND_API_KEY, or EMAIL_USER+EMAIL_PASSWORD."
    );
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
