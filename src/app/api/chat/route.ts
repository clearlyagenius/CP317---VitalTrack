import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { callGeminiChat } from "@/lib/geminiChat";
import { getUserIdFromSession } from "@/lib/auth";

function buildSystemPrompt(userName: string, reportSummary: string, markerSummary: string, reminderSummary: string) {
  return `You are VitalTrack's AI health assistant, talking with ${userName}.

Your responsibilities:
- Understand the user's questions, goals, symptoms, and health information.
- Review the provided health data below to identify important insights.
- Explain findings in simple, clear language.
- Provide practical recommendations for improving health and reaching goals.
- Ask relevant follow-up questions when more information is needed.
- Maintain a supportive, friendly, and motivating tone.

Response style rules — follow these strictly:
- Do not use markdown formatting (no asterisks, bold, or bullet symbols) — write in plain conversational sentences.
- Keep replies short: 3-5 sentences for general questions, longer only if the user explicitly asks for detail.
- Give at most 2-3 recommendations at a time, focused on what's most relevant.
- When you lack data to personalize advice, ask ONE short clarifying question first.
- Never diagnose conditions or prescribe medication — recommend a healthcare professional for anything clinical.

User's uploaded reports:
${reportSummary}

Flagged markers from analyzed reports:
${markerSummary}

User's active reminders:
${reminderSummary}`;
}

export async function GET(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const messages = db
    .prepare("SELECT id, role, content, createdAt FROM chat_messages WHERE userId = ? ORDER BY createdAt ASC")
    .all(userId);

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

    const user = db.prepare("SELECT firstName FROM users WHERE id = ?").get(userId) as { firstName: string };

    db.prepare(
      `INSERT INTO chat_messages (id, userId, role, content) VALUES (?, ?, 'user', ?)`
    ).run(randomUUID(), userId, message);

    const history = db
      .prepare("SELECT role, content FROM chat_messages WHERE userId = ? ORDER BY createdAt ASC LIMIT 20")
      .all(userId) as { role: "user" | "assistant"; content: string }[];

    const reports = db
      .prepare("SELECT fileName, createdAt, analysisStatus, analysisSummary FROM reports WHERE userId = ? ORDER BY createdAt DESC LIMIT 5")
      .all(userId) as { fileName: string; createdAt: string; analysisStatus: string; analysisSummary: string | null }[];

    const reportSummary = reports.length
      ? reports
          .map((r) =>
            r.analysisStatus === "analyzed" && r.analysisSummary
              ? `Report "${r.fileName}" (${r.createdAt}): ${r.analysisSummary}`
              : `Report "${r.fileName}" (${r.createdAt}): ${r.analysisStatus}.`
          )
          .join("\n")
      : "No reports uploaded yet.";

    const flaggedMarkers = db
      .prepare("SELECT name, value, unit, flag, explanation FROM report_markers WHERE userId = ? AND flag != 'normal' ORDER BY createdAt DESC LIMIT 10")
      .all(userId) as { name: string; value: number; unit: string; flag: string; explanation: string }[];

    const markerSummary = flaggedMarkers.length
      ? flaggedMarkers.map((m) => `${m.name}: ${m.value} ${m.unit} (${m.flag}) — ${m.explanation}`).join("\n")
      : "No flagged markers.";

    const reminders = db
      .prepare("SELECT name, category, frequency, time FROM reminders WHERE userId = ?")
      .all(userId) as { name: string; category: string; frequency: string; time: string }[];

    const reminderSummary = reminders.length
      ? reminders.map((r) => `- ${r.name} (${r.category}, ${r.frequency}, ${r.time})`).join("\n")
      : "No active reminders.";

    const systemPrompt = buildSystemPrompt(user.firstName, reportSummary, markerSummary, reminderSummary);
    const reply = await callGeminiChat(systemPrompt, history);

    db.prepare(
      `INSERT INTO chat_messages (id, userId, role, content) VALUES (?, ?, 'assistant', ?)`
    ).run(randomUUID(), userId, reply);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat POST error:", error);
    return NextResponse.json({ error: "Something went wrong processing your message." }, { status: 500 });
  }
}