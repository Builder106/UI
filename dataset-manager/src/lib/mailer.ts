import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import ConsentEmail from './templates/ConsentEmail';
import { signConsentToken, buildConsentUrls } from './consentToken';
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
  entryId?: string;
};

export async function sendConsentEmailFromData(to: string, subject: string, entryId: string, data: ConsentEmailData) {
  const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 5173}`;
  const token = signConsentToken({
    entryId,
    to,
    scope: 'all_shots',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 // 30 days
  });
  const links = buildConsentUrls(baseUrl, token);

  const html = await render(createElement(ConsentEmail, {
    creatorName: data.creatorName,
    shotTitle: data.shotTitle,
    shotUrl: data.shotUrl,
    shotImage: data.shotImage,
    senderName: data.senderName || process.env.SENDER_NAME || 'WeaveUI Team',
    senderRole: data.senderRole || process.env.SENDER_ROLE || '',
    senderOrg: data.senderOrg || process.env.SENDER_ORG || '',
    senderEmail: data.senderEmail || process.env.SENDER_EMAIL || '',
    logoSrc: 'cid:weaveui-logo',
    approveUrl: links.approveUrl,
    declineUrl: links.declineUrl,
    pageUrl: links.pageUrl
  } as any));
  const text = `Hi ${data.creatorName},\n\nI’m requesting permission to include all of your current Dribbble shots in a non‑commercial research dataset.\n\nApprove: ${links.approveUrl}\nDecline: ${links.declineUrl}\n\nDetails: ${links.pageUrl}\n\nBest,\n${data.senderName || process.env.SENDER_NAME || 'WeaveUI Team'}\n${data.senderRole || process.env.SENDER_ROLE || ''}\n${data.senderOrg || process.env.SENDER_ORG || ''}\n${data.senderEmail || process.env.SENDER_EMAIL || ''}`;
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

export async function sendConsentDecisionReceipt(to: string, entryId: string, decision: 'approve' | 'decline' | 'revoke', opts?: { undoUrl?: string; detailsUrl?: string }) {
  const subj = `[WeaveUI] Consent ${decision === 'approve' ? 'granted' : decision === 'decline' ? 'declined' : 'revoked'}`;
  const lines = [
    `Thanks for your decision regarding inclusion of your current Dribbble shots in the research dataset.`,
    `Decision: ${decision.toUpperCase()}`,
    opts?.detailsUrl ? `Details: ${opts.detailsUrl}` : undefined,
    decision === 'approve' && opts?.undoUrl ? `If this wasn’t you, you can revoke here (valid 7 days): ${opts.undoUrl}` : undefined,
    decision === 'decline' && opts?.detailsUrl ? `If you change your mind later, use the details link above.` : undefined
  ].filter(Boolean).join('\n\n');
  return transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SENDER_EMAIL || process.env.SMTP_USER,
    to,
    subject: subj,
    text: lines,
    headers: { 'X-WeaveUI': 'true', 'X-WeaveUI-Entry': entryId, 'X-WeaveUI-Type': 'consent-receipt' }
  });
}