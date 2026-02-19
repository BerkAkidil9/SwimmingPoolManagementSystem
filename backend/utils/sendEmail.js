/**
 * E-posta gönderimi - Render free tier SMTP engellendiği için HTTP tabanlı çözümler kullanır.
 * Öncelik: Gmail API (HTTPS) > Resend API > Nodemailer SMTP (sadece lokal)
 */
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const EMAIL_FROM =
  process.env.EMAIL_FROM || (GMAIL_USER ? `Swim Center <${GMAIL_USER}>` : "Swim Center <onboarding@resend.dev>");

let resendClient = null;
let gmailClient = null;
let nodemailerTransporter = null;

function getGmailClient() {
  if (
    !gmailClient &&
    GMAIL_USER &&
    GMAIL_REFRESH_TOKEN &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  ) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "http://localhost:3333/oauth2callback"
    );
    oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
    gmailClient = google.gmail({ version: "v1", auth: oauth2Client });
  }
  return gmailClient;
}

function buildRfc2822Message({ from, to, subject, html }) {
  const toAddr = Array.isArray(to) ? to.join(", ") : to;
  const lines = [
    `From: ${from}`,
    `To: ${toAddr}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ];
  return lines.join("\r\n");
}

function toBase64Url(str) {
  return Buffer.from(str, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendViaGmailApi({ to, subject, html, from }) {
  const fromAddr = from || EMAIL_FROM;
  const gmail = getGmailClient();
  if (!gmail) return null;

  const message = buildRfc2822Message({ from: fromAddr, to, subject, html });
  const raw = toBase64Url(message);

  await gmail.users.messages.send({
    userId: GMAIL_USER,
    requestBody: { raw },
  });
  return { ok: true };
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
  const hasGmail =
    GMAIL_USER &&
    GMAIL_REFRESH_TOKEN &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET;
  const resend = getResend();

  let provider = "none";
  if (hasGmail) {
    provider = "Gmail API";
  } else if (resend) {
    provider = "Resend";
  } else {
    provider = "Nodemailer SMTP";
  }
  console.log("[sendEmail] Provider:", provider);

  if (hasGmail) {
    try {
      const result = await sendViaGmailApi({ to, subject, html, from: fromAddr });
      if (result) return result;
    } catch (err) {
      console.error("[sendEmail] Gmail API error:", err.message, err.response?.data || err);
      throw err;
    }
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
