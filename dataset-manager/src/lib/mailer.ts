import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE) === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

export async function sendConsentEmail(to: string, subject: string, text: string, entryId: string) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    bcc: process.env.SMTP_BCC,
    replyTo: process.env.SMTP_REPLY_TO,
    subject: `[WeaveUI] ${subject}`,
    text,
    headers: { 'X-WeaveUI': 'true', 'X-WeaveUI-Entry': entryId, 'X-WeaveUI-Type': 'consent' }
  });
}