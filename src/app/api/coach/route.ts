import { NextRequest, NextResponse } from "next/server";
import { generateCoachRecommendations } from "@/lib/gemini";
import db from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const user = db
    .prepare("SELECT id FROM users WHERE sessionToken = ?")
    .get(token) as { id: string } | undefined;

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Get all flagged markers for this user
    const flaggedMarkers = db
      .prepare(`
        SELECT name, value, unit, flag
        FROM report_markers
        WHERE userId = ? AND flag != 'normal'
      `)
      .all(user.id);

    if (flaggedMarkers.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const recommendations = await generateCoachRecommendations(flaggedMarkers);
    return NextResponse.json({ recommendations });
  } catch (err: any) {
    console.error("Coach API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
