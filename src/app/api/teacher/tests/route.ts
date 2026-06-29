import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { batchId, title, maxMarks, testDate } = await request.json();

    if (!batchId || !title || !maxMarks || !testDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const maxMarksNum = parseInt(maxMarks, 10);
    if (isNaN(maxMarksNum) || maxMarksNum <= 0) {
      return NextResponse.json(
        { error: "Invalid maximum marks" },
        { status: 400 }
      );
    }

    // Create the test
    const test = await db.test.create({
      data: {
        batchId,
        title,
        maxMarks: maxMarksNum,
        testDate: new Date(testDate),
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_TEST",
        details: JSON.stringify({
          testId: test.id,
          title: test.title,
          batchId,
        }),
      },
    });

    return NextResponse.json({ success: true, test });
  } catch (error) {
    console.error("Create test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
