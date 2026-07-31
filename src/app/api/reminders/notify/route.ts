import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getUserIdFromSession } from "@/lib/auth";
import { sendReminderEmail } from "@/lib/email";

interface ReminderRow {
  id: string;
  name: string;
  day: string;
  time: string;
  category: string;
  notifyVia: string;
}

// POST — manually send a reminder notification email
export async function POST(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const { reminderId } = await req.json();

    if (!reminderId) {
      return NextResponse.json({ error: "Reminder ID is required." }, { status: 400 });
    }

    // Fetch the reminder
    const reminder = db
      .prepare("SELECT id, name, day, time, category, notifyVia FROM reminders WHERE id = ? AND userId = ?")
      .get(reminderId, userId) as ReminderRow | undefined;

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
    }

    if (reminder.notifyVia !== "Email") {
      return NextResponse.json(
        { error: "This reminder does not have email notifications enabled." },
        { status: 400 }
      );
    }

    // Get the user's email
    const user = db
      .prepare("SELECT email FROM users WHERE id = ?")
      .get(userId) as { email: string } | undefined;

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await sendReminderEmail({
      to: user.email,
      reminderName: reminder.name,
      category: reminder.category,
      day: reminder.day,
      time: reminder.time,
    });

    return NextResponse.json({ success: true, message: `Reminder email sent to ${user.email}.` });
  } catch (error) {
    console.error("Notify error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send notification." },
      { status: 500 }
    );
  }
}
