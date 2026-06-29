import nodemailer from "nodemailer";

// Create a transporter using environment variables
// If SMTP variables are not set, it will operate in log-only fallback mode
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // Fallback mode
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
};

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Send an email. Falls back to console logging if SMTP is not configured.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
  const transporter = getTransporter();

  if (!transporter) {
    console.log("\n==================================================");
    console.log("📨 [SMTP MAIL SIMULATOR - NOT CONFIGURED IN .ENV]");
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("--------------------------------------------------");
    console.log(`Text:\n${text}`);
    console.log("==================================================\n");
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Apex Academy" <${process.env.SMTP_FROM || "no-reply@apexacademy.com"}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`Message sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("Error sending email via SMTP:", error);
    return false;
  }
}
