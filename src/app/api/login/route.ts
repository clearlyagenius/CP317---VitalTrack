import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "@/lib/db";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = db
      .prepare("SELECT id, firstName, lastName, email, passwordHash FROM users WHERE email = ?")
      .get(email) as UserRow | undefined;

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = bcrypt.compareSync(password, user.passwordHash);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Generate session token and store it
    const sessionToken = randomUUID();
    db.prepare("UPDATE users SET sessionToken = ? WHERE id = ?").run(sessionToken, user.id);

    // Set session cookie
    const res = NextResponse.json({
      success: true,
      userId: user.id,
      firstName: user.firstName,
    });

    res.cookies.set("session", sessionToken, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
