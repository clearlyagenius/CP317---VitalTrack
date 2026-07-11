import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

function getUserFromSession(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  return db
    .prepare("SELECT id, role, availabilityStatus FROM users WHERE sessionToken = ?")
    .get(token) as { id: string; role: string; availabilityStatus: string } | undefined;
}

export async function GET(req: NextRequest) {
  const user = getUserFromSession(req);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fetchAll = searchParams.get("all");

  if (fetchAll === "true") {
    const doctors = db
      .prepare("SELECT id, firstName, lastName, availabilityStatus, email FROM users WHERE role = 'Doctor'")
      .all();
    return NextResponse.json({ doctors });
  }

  return NextResponse.json({ status: user.availabilityStatus, role: user.role });
}

export async function POST(req: NextRequest) {
  const user = getUserFromSession(req);
  if (!user || user.role !== 'Doctor') {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  try {
    const { status } = await req.json();
    db.prepare("UPDATE users SET availabilityStatus = ? WHERE id = ?").run(status, user.id);
    return NextResponse.json({ success: true, status });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update status." }, { status: 500 });
  }
}
