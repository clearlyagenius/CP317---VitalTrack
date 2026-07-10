import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import db from "@/lib/db";

// Helper to get userId from session cookie
function getUserIdFromSession(req: NextRequest): string | null {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  const user = db
    .prepare("SELECT id FROM users WHERE sessionToken = ?")
    .get(token) as { id: string } | undefined;

  return user?.id || null;
}

// GET — list reports for the logged-in user
export async function GET(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const reports = db
    .prepare("SELECT id, fileName, fileSize, createdAt FROM reports WHERE userId = ? ORDER BY createdAt DESC")
    .all(userId);

  return NextResponse.json({ reports });
}

// POST — upload a report file
export async function POST(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Save file to uploads directory
    const uploadsDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const fileId = randomUUID();
    const ext = path.extname(file.name);
    const savedName = `${fileId}${ext}`;
    const filePath = path.join(uploadsDir, savedName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Save metadata to database
    db.prepare(
      `INSERT INTO reports (id, userId, fileName, fileSize, filePath, createdAt)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).run(fileId, userId, file.name, file.size, filePath);

    return NextResponse.json(
      { success: true, reportId: fileId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed." },
      { status: 500 }
    );
  }
}
