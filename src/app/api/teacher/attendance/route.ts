import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId") || "";
    const month = searchParams.get("month") || "";
    const year = searchParams.get("year") || "";

    // Find teacher
    const teacher = await db.teacher.findUnique({
      where: { userId: session.userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    // 1. If no batchId, return all batches handled by this teacher
    if (!batchId) {
      const batches = await db.batch.findMany({
        where: { teacherId: teacher.id },
        select: { id: true, name: true },
      });
      return NextResponse.json({ batches });
    }

    // 2. Fetch students in the selected batch
    const students = await db.student.findMany({
      where: { batchId },
      select: { id: true, name: true, admissionId: true },
      orderBy: { name: "asc" },
    });

    // 3. Fetch attendance in the selected month and year if supplied
    let attendance: Array<{ id: string; studentId: string; date: Date; status: string; remarks: string | null }> = [];
    if (month && year) {
      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);

      const startOfMonth = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59));

      attendance = await db.attendance.findMany({
        where: {
          studentId: { in: students.map((s) => s.id) },
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });
    }

    return NextResponse.json({ students, attendance });
  } catch (error) {
    console.error("Fetch attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { batchId, date, attendanceData } = await request.json();

    if (!batchId || !date || !Array.isArray(attendanceData)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Parse date correctly as UTC noon to prevent timezone offsets
    const dateObj = new Date(date + "T12:00:00Z");

    // Perform upsert inside a transaction
    await db.$transaction(
      attendanceData.map((item: { studentId: string; status: string; remarks?: string }) =>
        db.attendance.upsert({
          where: {
            studentId_date: {
              studentId: item.studentId,
              date: dateObj,
            },
          },
          update: {
            status: item.status,
            remarks: item.remarks || null,
          },
          create: {
            studentId: item.studentId,
            date: dateObj,
            status: item.status,
            remarks: item.remarks || null,
          },
        })
      )
    );

    // Create Audit Log
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      select: { name: true },
    });

    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "RECORD_ATTENDANCE",
        details: JSON.stringify({
          batchId,
          batchName: batch ? batch.name : "N/A",
          date,
          recordsCount: attendanceData.length,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Record attendance error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
