import { Resend } from "resend";

interface ReminderEmailParams {
  to: string;
  reminderName: string;
  category: string;
  day: string;
  time: string;
}

/**
 * Send a reminder notification email.
 * Uses Resend's default "onboarding@resend.dev" sender on the free tier.
 */
export async function sendReminderEmail({ to, reminderName, category, day, time }: ReminderEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured in environment variables.");
  }
  const resend = new Resend(apiKey);
  
  // Convert 24h time to 12h display
  const [h, m] = time.split(":");
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  const displayTime = `${hour}:${m} ${ampm}`;

  const { data, error } = await resend.emails.send({
    from: "VitalTrack <onboarding@resend.dev>",
    to,
    subject: `VitalTrack Reminder: ${reminderName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #16a34a; font-size: 1.5rem; margin: 0;">VitalTrack</h1>
        </div>
        <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 24px;">
          <h2 style="color: #111827; font-size: 1.2rem; margin: 0 0 8px;">Upcoming Reminder</h2>
          <p style="color: #374151; font-size: 1rem; margin: 0 0 16px;">
            Your reminder <strong>"${reminderName}"</strong> is coming up.
          </p>
          <table style="width: 100%; font-size: 0.9rem; color: #374151;">
            <tr>
              <td style="padding: 4px 0; font-weight: 600;">Category</td>
              <td style="padding: 4px 0;">${category}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 600;">Scheduled</td>
              <td style="padding: 4px 0;">${day} at ${displayTime}</td>
            </tr>
          </table>
        </div>
        <p style="color: #9ca3af; font-size: 0.75rem; text-align: center; margin-top: 24px;">
          This email was sent by VitalTrack. You received it because you have email notifications enabled for this reminder.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error(error.message || "Failed to send email.");
  }

  return data;
}
