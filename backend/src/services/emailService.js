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

  const allowInsecureTls =
    process.env.SMTP_ALLOW_INSECURE_TLS === 'true' ||
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false';

  const transportConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    ...(allowInsecureTls ? { tls: { rejectUnauthorized: false } } : {}),
  };

  const transporter = nodemailer.createTransport(transportConfig);

  const mailOptions = {
    from: process.env.SMTP_FROM || '"WashPro" <no-reply@washpro.com>',
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    if (allowInsecureTls) {
      throw err;
    }

    const isCertError =
      /certificate has expired/i.test(err?.message || '') ||
      /unable to verify the first certificate/i.test(err?.message || '') ||
      /self signed certificate/i.test(err?.message || '');

    if (process.env.NODE_ENV !== 'production' && isCertError) {
      console.log('\n============================================================');
      console.log(`[EMAIL DEV FALLBACK - SMTP TLS ERROR]`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`SMTP Error: ${err.message}`);
      console.log(`Content:\n${html.replace(/<[^>]*>/g, ' ')}`);
      console.log('============================================================\n');
      return { skipped: true, devMode: true, reason: 'SMTP_TLS_ERROR' };
    }

    throw err;
  }
};

module.exports = { sendEmail };
