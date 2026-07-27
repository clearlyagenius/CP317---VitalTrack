import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getUserIdFromSession } from "@/lib/auth";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  passwordHash: string;
}

// GET — return the authenticated user's current profile
export async function GET(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = db
    .prepare("SELECT id, firstName, lastName, email, dateOfBirth FROM users WHERE id = ?")
    .get(userId) as Omit<UserRow, "passwordHash"> | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PATCH — update the authenticated user's profile
export async function PATCH(req: NextRequest) {
  const userId = getUserIdFromSession(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { firstName, lastName, email, dateOfBirth, currentPassword, newPassword } = body;

    // ---- basic field validation (mirrors /api/register) ----
    if (!firstName || !lastName || !email || !dateOfBirth) {
      return NextResponse.json(
        { error: "First name, last name, email, and date of birth are required." },
        { status: 400 }
      );
    }

    if (typeof firstName !== "string" || firstName.trim().length === 0) {
      return NextResponse.json({ error: "First name cannot be empty." }, { status: 400 });
    }

    if (typeof lastName !== "string" || lastName.trim().length === 0) {
      return NextResponse.json({ error: "Last name cannot be empty." }, { status: 400 });
    }

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Check for email uniqueness (excluding current user)
    const duplicate = db
      .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .get(email, userId) as { id: string } | undefined;

    if (duplicate) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // ---- password change (optional) ----
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password." },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters." },
          { status: 400 }
        );
      }

      const user = db
        .prepare("SELECT passwordHash FROM users WHERE id = ?")
        .get(userId) as { passwordHash: string } | undefined;

      if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 403 }
        );
      }

      const newHash = bcrypt.hashSync(newPassword, 10);
      db.prepare(
        "UPDATE users SET firstName = ?, lastName = ?, email = ?, dateOfBirth = ?, passwordHash = ? WHERE id = ?"
      ).run(firstName.trim(), lastName.trim(), email.trim(), dateOfBirth, newHash, userId);
    } else {
      db.prepare(
        "UPDATE users SET firstName = ?, lastName = ?, email = ?, dateOfBirth = ? WHERE id = ?"
      ).run(firstName.trim(), lastName.trim(), email.trim(), dateOfBirth, userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
