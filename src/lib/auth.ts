import { cookies } from "next/headers";
import db from "./db";

interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  const user = db
    .prepare("SELECT id, firstName, lastName, email, role FROM users WHERE sessionToken = ?")
    .get(token) as SessionUser | undefined;

  return user || null;
}
