import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn('SMTP not configured. Verification emails will be logged to console.');
    return null;
  }
  transporter = nodemailer.createTransport({ host, port, secure: false, auth: { user, pass } });
  return transporter;
}

export async function sendVerificationEmail(to, username, verificationUrl) {
  const transport = getTransporter();
  const html = `
    <h2>Verify your PhoeniX account</h2>
    <p>Hi ${username},</p>
    <p>Please verify your email by clicking the link below:</p>
    <p><a href="${verificationUrl}">${verificationUrl}</a></p>
    <p>This link expires in 24 hours.</p>
    <p>— PhoeniX</p>
  `;
  if (transport) {
    await transport.sendMail({
      from: '"PhoeniX" <noreply@phoenix.local>',
      to,
      subject: 'Verify your email — PhoeniX',
      html,
    });
  } else {
    console.log('[EMAIL] Verification link for', to, ':', verificationUrl);
  }
}
