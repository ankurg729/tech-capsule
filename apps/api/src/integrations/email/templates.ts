import type { EmailMessage } from './email.types.js';

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

function layout(title: string, intro: string, code: string, link: string, footer: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0B1020;font-family:Arial,sans-serif;color:#E6E9F5">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="480" cellpadding="0" cellspacing="0" style="background:#141A33;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:bold;color:#A78BFA">TechCapsule.dev</td></tr>
<tr><td style="padding-top:16px;font-size:18px;font-weight:bold">${escapeHtml(title)}</td></tr>
<tr><td style="padding-top:12px;font-size:14px;line-height:22px;color:#B8BEDA">${escapeHtml(intro)}</td></tr>
<tr><td style="padding:24px 0;font-size:30px;letter-spacing:6px;font-weight:bold;font-family:monospace;color:#FFFFFF">${escapeHtml(code)}</td></tr>
<tr><td><a href="${escapeHtml(link)}" style="display:inline-block;background:#7C5CFF;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">Open in the app</a></td></tr>
<tr><td style="padding-top:24px;font-size:12px;color:#7A819F">${escapeHtml(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function verificationEmail(opts: {
  to: string;
  name: string;
  code: string;
  link: string;
  ttlHours: number;
}): EmailMessage {
  const intro = `Hi ${opts.name}, enter this code in the TechCapsule app to verify your email address.`;
  const footer = `The code expires in ${opts.ttlHours} hours. If you didn't create an account, you can ignore this email.`;
  return {
    to: opts.to,
    subject: 'Verify your TechCapsule email',
    text: `${intro}\n\nVerification code: ${opts.code}\n\nOpen in app: ${opts.link}\n\n${footer}`,
    html: layout('Verify your email', intro, opts.code, opts.link, footer),
  };
}

export function passwordResetEmail(opts: {
  to: string;
  name: string;
  code: string;
  link: string;
  ttlMinutes: number;
}): EmailMessage {
  const intro = `Hi ${opts.name}, use this code to reset your TechCapsule password.`;
  const footer = `The code expires in ${opts.ttlMinutes} minutes. If you didn't request a reset, you can ignore this email — your password is unchanged.`;
  return {
    to: opts.to,
    subject: 'Reset your TechCapsule password',
    text: `${intro}\n\nReset code: ${opts.code}\n\nOpen in app: ${opts.link}\n\n${footer}`,
    html: layout('Reset your password', intro, opts.code, opts.link, footer),
  };
}
