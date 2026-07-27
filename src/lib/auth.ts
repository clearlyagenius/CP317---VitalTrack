import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import db from "./db";

interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface SessionRow extends SessionUser {
  sessionExpiresAt: string | null;
}

function isSessionExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false; // legacy rows without expiry are still valid
  return new Date(expiresAt) <= new Date();
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  const row = db
    .prepare("SELECT id, firstName, lastName, email, sessionExpiresAt FROM users WHERE sessionToken = ?")
    .get(token) as SessionRow | undefined;

  if (!row) return null;

  if (isSessionExpired(row.sessionExpiresAt)) {
    // Invalidate the stale session in the DB
    db.prepare("UPDATE users SET sessionToken = NULL, sessionExpiresAt = NULL WHERE id = ?").run(row.id);
    return null;
  }

  const { sessionExpiresAt: _, ...user } = row;
  return user;
}

// Helper to get userId from session cookie
export function getUserIdFromSession(req: NextRequest): string | null {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  const row = db
    .prepare("SELECT id, sessionExpiresAt FROM users WHERE sessionToken = ?")
    .get(token) as { id: string; sessionExpiresAt: string | null } | undefined;

  if (!row) return null;

  if (isSessionExpired(row.sessionExpiresAt)) {
    db.prepare("UPDATE users SET sessionToken = NULL, sessionExpiresAt = NULL WHERE id = ?").run(row.id);
    return null;
  }

  return row.id;
}