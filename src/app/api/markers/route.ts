// REP-3: GET /api/markers — all structured markers for the logged-in user,
// across every analyzed report, newest first.
//
// This is the hand-off point for the stories that depend on REP-3:
//  - UI-2 charts a marker over time (?name=Glucose%20(Fasting))
//  - AI-1 reads the flagged markers (?flagged=true) to build its prompt

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

function getUserIdFromSession(req: NextRequest): string | null {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  const user = db
    .prepare("SELECT id FROM users WHERE sessionToken = ?")
    .get(token) as { id: string } | undefined;

  return user?.id || null;
}

export async function GET(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const flaggedOnly = searchParams.get("flagged") === "true";

  let sql = `
    SELECT m.name, m.value, m.unit, m.refLow, m.refHigh, m.flag, m.explanation,
           m.reportId, r.fileName, r.createdAt AS reportDate
    FROM report_markers m
    JOIN reports r ON r.id = m.reportId
    WHERE m.userId = ?`;
  const args: unknown[] = [userId];

  if (name) {
    sql += " AND m.name = ?";
    args.push(name);
  }
  if (flaggedOnly) {
    sql += " AND m.flag != 'normal'";
  }
  sql += " ORDER BY r.createdAt DESC, m.name";

  const markers = db.prepare(sql).all(...args);
  return NextResponse.json({ markers });
}
