import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";

function getUserIdFromSession(req: NextRequest): string | null {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  const user = db
    .prepare("SELECT id FROM users WHERE sessionToken = ?")
    .get(token) as { id: string } | undefined;

  return user?.id || null;
}

// GET — list reminders for the logged-in user
export async function GET(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const reminders = db
    .prepare("SELECT id, name, day, time, category, frequency, notifyVia, createdAt FROM reminders WHERE userId = ? ORDER BY time ASC")
    .all(userId);

  return NextResponse.json({ reminders });
}

// POST — create a new reminder
export async function POST(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, day, time, category, frequency, notifyVia } = body;

    if (!name || !day || !time || !category || !frequency || !notifyVia) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const id = randomUUID();

    db.prepare(
      `INSERT INTO reminders (id, userId, name, day, time, category, frequency, notifyVia)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, userId, name, day, time, category, frequency, notifyVia);

    return NextResponse.json({ success: true, reminderId: id }, { status: 201 });
  } catch (error) {
    console.error("Reminder creation error:", error);
    return NextResponse.json({ error: "Failed to create reminder." }, { status: 500 });
  }
}

// DELETE — remove a reminder
export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Reminder ID is required." }, { status: 400 });
    }

    db.prepare("DELETE FROM reminders WHERE id = ? AND userId = ?").run(id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reminder deletion error:", error);
    return NextResponse.json({ error: "Failed to delete reminder." }, { status: 500 });
  }
}
