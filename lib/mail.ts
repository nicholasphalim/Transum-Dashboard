import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendResetEmail(to: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"TransUm Dashboard" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Reset Password - TransUm Dashboard',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #40916c;">Reset Password</h2>
        <p>Anda menerima email ini karena ada permintaan untuk mengatur ulang password akun Anda di Dashboard TransUm Bandung.</p>
        <p>Silakan klik tombol di bawah ini untuk mengatur ulang password Anda:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #40916c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">Jika Anda tidak merasa meminta reset password, Anda dapat mengabaikan email ini dengan aman.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Tautan ini akan kedaluwarsa dalam 1 jam.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
