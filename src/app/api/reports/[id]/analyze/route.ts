// REP-3: Analyze Health Reports
// POST /api/reports/[id]/analyze  — run Gemini analysis on an uploaded report
// GET  /api/reports/[id]/analyze  — fetch stored analysis results

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import db from "@/lib/db";
import { extractMarkersFromReport } from "@/lib/gemini";
import { analyzeMarker } from "@/lib/analysis";
import { getUserIdFromSession } from "@/lib/auth";

interface ReportRow {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  analysisStatus: string;
  analysisSummary: string | null;
}

// Only the report's owner may read or analyze it
function getOwnedReport(reportId: string, userId: string): ReportRow | null {
  const report = db
    .prepare("SELECT id, userId, fileName, filePath, analysisStatus, analysisSummary FROM reports WHERE id = ?")
    .get(reportId) as ReportRow | undefined;

  if (!report || report.userId !== userId) return null;
  return report;
}

function getMimeType(fileName: string): string {
  switch (path.extname(fileName).toLowerCase()) {
    case ".pdf": return "application/pdf";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    default: return "text/plain";
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const report = getOwnedReport(id, userId);
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const markers = db
    .prepare(
      "SELECT name, value, unit, refLow, refHigh, flag, explanation FROM report_markers WHERE reportId = ? ORDER BY name"
    )
    .all(report.id);

  return NextResponse.json({
    status: report.analysisStatus,
    summary: report.analysisSummary,
    markers,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const report = getOwnedReport(id, userId);
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(report.filePath);
    const mimeType = getMimeType(report.fileName);

    const extraction = await extractMarkersFromReport(fileBuffer, mimeType);

    if (!extraction.isBloodReport || extraction.markers.length === 0) {
      db.prepare(
        "UPDATE reports SET analysisStatus = 'failed', analysisSummary = ? WHERE id = ?"
      ).run("No blood test markers could be found in this file.", report.id);

      return NextResponse.json(
        { error: "This file doesn't appear to be a blood test report." },
        { status: 422 }
      );
    }

    // Flag each marker against its reference range
    const analyzed = extraction.markers.map(analyzeMarker);

    // Replace any previous analysis of this report, then insert the new
    // markers — all in one transaction so a failure can't leave half a result
    const saveAnalysis = db.transaction(() => {
      db.prepare("DELETE FROM report_markers WHERE reportId = ?").run(report.id);

      const insert = db.prepare(
        `INSERT INTO report_markers (id, reportId, userId, name, value, unit, refLow, refHigh, flag, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const m of analyzed) {
        insert.run(randomUUID(), report.id, userId, m.name, m.value, m.unit, m.refLow, m.refHigh, m.flag, m.explanation);
      }

      db.prepare(
        "UPDATE reports SET analysisStatus = 'analyzed', analysisSummary = ? WHERE id = ?"
      ).run(extraction.summary, report.id);
    });
    saveAnalysis();

    return NextResponse.json({
      success: true,
      summary: extraction.summary,
      markers: analyzed,
      flaggedCount: analyzed.filter((m) => m.flag !== "normal").length,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    db.prepare("UPDATE reports SET analysisStatus = 'failed' WHERE id = ?").run(report.id);

    const message =
      error instanceof Error && error.message.includes("GEMINI_API_KEY")
        ? error.message
        : "Analysis failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
