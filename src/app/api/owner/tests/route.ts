import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testId = searchParams.get("testId") || "";

    if (testId) {
      // Fetch specific test details and student marks
      const test = await db.test.findUnique({
        where: { id: testId },
        include: {
          batch: {
            select: { name: true },
          },
        },
      });

      if (!test) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
      }

      const marks = await db.marks.findMany({
        where: { testId },
        include: {
          student: {
            select: { name: true, admissionId: true },
          },
        },
        orderBy: {
          student: { name: "asc" },
        },
      });

      // Calculate stats
      const scores = marks.map((m) => Number(m.score));
      const highest = scores.length > 0 ? Math.max(...scores) : 0;
      const lowest = scores.length > 0 ? Math.min(...scores) : 0;
      const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      return NextResponse.json({
        test,
        marks,
        stats: {
          highest,
          lowest,
          average: Number(average.toFixed(1)),
          count: scores.length,
        },
      });
    }

    // Fetch all tests
    const tests = await db.test.findMany({
      orderBy: {
        testDate: "desc",
      },
      include: {
        batch: {
          select: { name: true },
        },
        _count: {
          select: { marks: true },
        },
      },
    });

    return NextResponse.json({ tests });
  } catch (error) {
    console.error("Fetch owner tests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
