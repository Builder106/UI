import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import ConsentEmail from './templates/ConsentEmail';
import { createElement } from 'react';
import path from 'path';
import { fileURLToPath } from 'url';

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE) === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  logger: String(process.env.SMTP_DEBUG) === 'true',
  debug: String(process.env.SMTP_DEBUG) === 'true',
  connectionTimeout: 15000,
  greetingTimeout: 8000,
  socketTimeout: 20000,
  tls: process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false' ? { rejectUnauthorized: false } : undefined
});

// Deprecated legacy sender retained for API compatibility; prefer sendConsentEmailFromData
export async function sendConsentEmail(to: string, subject: string, text: string, entryId: string) {
  // Minimal fallback: send plain text only with logo attachment
  const logoPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/weaveui_logo_icon.png');
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SENDER_EMAIL || process.env.SMTP_USER,
    to,
    bcc: process.env.SMTP_BCC,
    replyTo: process.env.SMTP_REPLY_TO,
    subject: `[WeaveUI] ${subject}`,
    text,
    attachments: [{ filename: 'weaveui_logo_icon.png', path: logoPath, cid: 'weaveui-logo' }],
    headers: { 'X-WeaveUI': 'true', 'X-WeaveUI-Entry': entryId, 'X-WeaveUI-Type': 'consent' }
  });
}

export type ConsentEmailData = {
  creatorName: string;
  shotTitle: string;
  shotUrl: string;
  shotImage?: string;
  senderName?: string;
  senderRole?: string;
  senderOrg?: string;
  senderEmail?: string;
};

export async function sendConsentEmailFromData(to: string, subject: string, entryId: string, data: ConsentEmailData) {
  const html = await render(createElement(ConsentEmail, {
    creatorName: data.creatorName,
    shotTitle: data.shotTitle,
    shotUrl: data.shotUrl,
    shotImage: data.shotImage,
    senderName: data.senderName || process.env.SENDER_NAME || 'WeaveUI Team',
    senderRole: data.senderRole || process.env.SENDER_ROLE || '',
    senderOrg: data.senderOrg || process.env.SENDER_ORG || '',
    senderEmail: data.senderEmail || process.env.SENDER_EMAIL || '',
    logoSrc: 'cid:weaveui-logo'
  }));
  const text = `Hi ${data.creatorName},\n\nI’m requesting permission to include all of your current Dribbble shots in a non‑commercial research dataset.\n\nExample shot: ${data.shotTitle} — ${data.shotUrl}\n\nUse: research and evaluation with attribution. No reselling or commercial licensing.\n\nBest,\n${data.senderName || process.env.SENDER_NAME || 'WeaveUI Team'}\n${data.senderRole || process.env.SENDER_ROLE || ''}\n${data.senderOrg || process.env.SENDER_ORG || ''}\n${data.senderEmail || process.env.SENDER_EMAIL || ''}`;
  const logoPath2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/weaveui_logo_icon.png');
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SENDER_EMAIL || process.env.SMTP_USER,
    to,
    bcc: process.env.SMTP_BCC,
    replyTo: process.env.SMTP_REPLY_TO,
    subject: `[WeaveUI] ${subject}`,
    text,
    html,
    attachments: [{ filename: 'weaveui_logo_icon.png', path: logoPath2, cid: 'weaveui-logo' }],
    headers: { 'X-WeaveUI': 'true', 'X-WeaveUI-Entry': entryId, 'X-WeaveUI-Type': 'consent' }
  });
}