const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
  // Check if SMTP is configured. If not, fallback to console log.
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('\n============================================================');
    console.log(`[EMAIL DEV FALLBACK]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${html.replace(/<[^>]*>/g, ' ')}`); // strip simple HTML tags for clean console display
    console.log('============================================================\n');
    return { skipped: true, devMode: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || '"WashPro" <no-reply@washpro.com>',
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return { ok: true, messageId: info.messageId };
};

module.exports = { sendEmail };
