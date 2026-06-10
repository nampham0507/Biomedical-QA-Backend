import nodemailer from 'nodemailer';
import logger from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<void> {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"BioMedQA" <${process.env.EMAIL_FROM}>`,
      to,
      subject: 'Reset Your Password — BioMedQA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0d9488;">Password Reset Request</h2>
          <p>You requested a password reset for your BioMedQA account.</p>
          <p>This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}" style="
            display: inline-block;
            background: #0d9488;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            margin: 16px 0;
          ">Reset Password</a>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this, ignore this email.
          </p>
        </div>
      `,
    });
  } catch (err) {
    logger.error('Email send failed:', err);
    throw new Error('Failed to send reset email');
  }
}
