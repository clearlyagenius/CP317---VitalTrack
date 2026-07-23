import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readFile } from "fs/promises";
import db from "@/lib/db";

function getUserIdFromSession(req: NextRequest): string | null {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  const user = db
    .prepare("SELECT id FROM users WHERE sessionToken = ?")
    .get(token) as { id: string } | undefined;

  return user?.id || null;
}

const METRIC_DEFS = [
  { name: "Glucose", unit: "mmol/L", normalMin: 4.0, normalMax: 5.6 },
  { name: "Haemoglobin", unit: "g/dL", normalMin: 12.0, normalMax: 16.0 },
  { name: "LDL Cholesterol", unit: "mg/dL", normalMin: 0, normalMax: 100 },
  { name: "Vitamin D", unit: "ng/mL", normalMin: 20, normalMax: 50 },
];

function parseMetricsFromText(text: string): { name: string; value: number; unit: string }[] {
  const results: { name: string; value: number; unit: string }[] = [];

  for (const def of METRIC_DEFS) {
    // Match lines like "Glucose: 5.2 mmol/L" or "LDL Cholesterol: 128 mg/dL"
    const pattern = new RegExp(
      `${def.name}\\s*[:\\-]\\s*([\\d.]+)\\s*${def.unit.replace("/", "\\/")}`,
      "i"
    );
    const match = text.match(pattern);
    if (match) {
      results.push({ name: def.name, value: parseFloat(match[1]), unit: def.unit });
    }
  }

  return results;
}

function seedMetricsFromFile(reportId: string, parsed: { name: string; value: number; unit: string }[]) {
  const insert = db.prepare(
    `INSERT INTO report_metrics (id, reportId, metricName, value, unit)
     VALUES (?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction(() => {
    for (const m of parsed) {
      insert.run(randomUUID(), reportId, m.name, m.value, m.unit);
    }
  });

  insertMany();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: reportId } = await params;

  const report = db
    .prepare("SELECT id, fileName, filePath, createdAt FROM reports WHERE id = ? AND userId = ?")
    .get(reportId, userId) as { id: string; fileName: string; filePath: string; createdAt: string } | undefined;

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  let metrics = db
    .prepare("SELECT metricName, value, unit FROM report_metrics WHERE reportId = ?")
    .all(reportId) as { metricName: string; value: number; unit: string }[];

  if (metrics.length === 0) {
    // Try to parse the actual file
    try {
      const content = await readFile(report.filePath, "utf-8");
      const parsed = parseMetricsFromText(content);

      if (parsed.length > 0) {
        seedMetricsFromFile(reportId, parsed);
      }
    } catch {
      // File unreadable (binary PDF/image) — skip
    }

    metrics = db
      .prepare("SELECT metricName, value, unit FROM report_metrics WHERE reportId = ?")
      .all(reportId) as { metricName: string; value: number; unit: string }[];
  }

  if (metrics.length === 0) {
    return NextResponse.json({
      report,
      metrics: [],
      message: "No biomarker data found in this file. Upload a text report with metrics like 'Glucose: 5.2 mmol/L'.",
    });
  }

  const enriched = metrics.map((m) => {
    const def = METRIC_DEFS.find((d) => d.name === m.metricName);
    let status = "Normal";
    if (def) {
      if (m.value < def.normalMin) status = "Low";
      else if (m.value > def.normalMax) status = "High";
      else if (
        m.value <= def.normalMin * 1.1 ||
        m.value >= def.normalMax * 0.95
      ) {
        status = "Borderline";
      }
    }
    return { ...m, status };
  });

  return NextResponse.json({ report, metrics: enriched });
}
