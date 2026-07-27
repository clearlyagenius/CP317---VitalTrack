import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, dateOfBirth } = body;

    if (!firstName || !lastName || !email || !password || !dateOfBirth) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password, generate session token, and insert user
    const id = randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);
    const sessionToken = randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare(
      `INSERT INTO users (id, firstName, lastName, email, passwordHash, dateOfBirth, sessionToken, sessionExpiresAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, firstName, lastName, email, passwordHash, dateOfBirth, sessionToken, sessionExpiresAt);

    // Set session cookie (auto-login after registration)
    const res = NextResponse.json({ success: true, userId: id }, { status: 201 });

    res.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return res;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
