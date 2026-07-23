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

interface TrendRow {
  reportId: string;
  fileName: string;
  reportDate: string;
  metricName: string;
  value: number;
  unit: string;
}

export async function GET(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const rows = db
    .prepare(
      `SELECT
         r.id        AS reportId,
         r.fileName  AS fileName,
         r.createdAt AS reportDate,
         rm.metricName,
         rm.value,
         rm.unit
       FROM reports r
       JOIN report_metrics rm ON rm.reportId = r.id
       WHERE r.userId = ?
       ORDER BY r.createdAt ASC`
    )
    .all(userId) as TrendRow[];

  const trends: Record<string, { date: string; value: number; fileName: string }[]> = {};

  for (const row of rows) {
    if (!trends[row.metricName]) {
      trends[row.metricName] = [];
    }
    trends[row.metricName].push({
      date: row.reportDate,
      value: row.value,
      fileName: row.fileName,
    });
  }

  return NextResponse.json({ trends });
}
