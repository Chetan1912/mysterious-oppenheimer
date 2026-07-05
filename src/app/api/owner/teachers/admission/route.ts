import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, phone } = body;

    // Validate inputs
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields (name, email, password)" },
        { status: 400 }
      );
    }

    const targetEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: targetEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already registered in the system" },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create User and Teacher record in a transaction
    const teacher = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: targetEmail,
          passwordHash,
          name: name.trim(),
          role: "TEACHER",
          phone: phone ? phone.trim() : null,
        },
      });

      const teacherRecord = await tx.teacher.create({
        data: {
          userId: user.id,
        },
        include: {
          user: true,
        },
      });

      return teacherRecord;
    });

    // Audit Log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_TEACHER",
        details: JSON.stringify({
          teacherId: teacher.id,
          userId: teacher.user.id,
          teacherName: teacher.user.name,
          teacherEmail: teacher.user.email,
        }),
      },
    });

    return NextResponse.json({ success: true, teacher });
  } catch (error) {
    console.error("Teacher admission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
