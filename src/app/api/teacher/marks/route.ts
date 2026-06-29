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
    const testId = searchParams.get("testId") || "";

    // Find teacher
    const teacher = await db.teacher.findUnique({
      where: { userId: session.userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    // 1. If no batchId, return all batches for this teacher
    if (!batchId) {
      const batches = await db.batch.findMany({
        where: { teacherId: teacher.id },
        select: { id: true, name: true },
      });
      return NextResponse.json({ batches });
    }

    // 2. Fetch tests and students for this batch
    const tests = await db.test.findMany({
      where: { batchId },
      orderBy: { testDate: "desc" },
    });

    const students = await db.student.findMany({
      where: { batchId },
      select: { id: true, name: true, admissionId: true },
      orderBy: { name: "asc" },
    });

    // 3. If testId is provided, fetch existing marks
    let existingMarks: import("@prisma/client").Marks[] = [];
    if (testId) {
      existingMarks = await db.marks.findMany({
        where: { testId },
      });
    }

    return NextResponse.json({
      tests,
      students,
      existingMarks,
    });
  } catch (error) {
    console.error("Fetch teacher marks configuration error:", error);
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

    const { testId, marksList } = await request.json();

    if (!testId || !Array.isArray(marksList)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const test = await db.test.findUnique({
      where: { id: testId },
      include: {
        batch: true,
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Use transaction to save all marks and create notifications
    const operations = [];

    for (const item of marksList) {
      const { studentId, score, remarks } = item;
      const scoreNum = Number(score);

      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > test.maxMarks) {
        continue; // Skip invalid scores
      }

      // 1. Upsert Marks
      operations.push(
        db.marks.upsert({
          where: {
            testId_studentId: {
              testId,
              studentId,
            },
          },
          update: {
            score: scoreNum,
            remarks: remarks || null,
          },
          create: {
            testId,
            studentId,
            score: scoreNum,
            remarks: remarks || null,
          },
        })
      );

      // 2. Fetch student's parent to send notification
      const student = await db.student.findUnique({
        where: { id: studentId },
        include: { parent: true },
      });

      if (student && student.parent) {
        operations.push(
          db.notification.create({
            data: {
              userId: student.parent.userId,
              title: "Test Marks Published",
              message: `Marks for ${student.name} in ${test.title} have been published. Score: ${scoreNum}/${test.maxMarks}. Remarks: ${remarks || "None"}.`,
            },
          })
        );
      }
    }

    // Execute transaction
    await db.$transaction(operations);

    // Audit Log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "PUBLISH_TEST_MARKS",
        details: JSON.stringify({
          testId,
          testTitle: test.title,
          studentCount: marksList.length,
        }),
      },
    });

    return NextResponse.json({ success: true, message: "Marks saved successfully" });
  } catch (error) {
    console.error("Save marks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
