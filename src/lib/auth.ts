import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import db from "./db";

interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  const user = db
    .prepare("SELECT id, firstName, lastName, email FROM users WHERE sessionToken = ?")
    .get(token) as SessionUser | undefined;

  return user || null;
}

// Helper to get userId from session cookie
export function getUserIdFromSession(req: NextRequest): string | null {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;

  const user = db
    .prepare("SELECT id FROM users WHERE sessionToken = ?")
    .get(token) as { id: string } | undefined;

  return user?.id || null;
}