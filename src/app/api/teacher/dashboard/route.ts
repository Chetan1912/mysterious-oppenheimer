import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find teacher record
    const teacher = await db.teacher.findUnique({
      where: { userId: session.userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    // 1. Fetch Teacher's Batches
    const batches = await db.batch.findMany({
      where: { teacherId: teacher.id },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    // 2. Fetch Today's Classes (from 00:00 to 23:59)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const schedules = await db.schedule.findMany({
      where: {
        teacherId: teacher.id,
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        batch: {
          select: { name: true },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    // 3. Fetch Recent Tests Created
    const recentTests = await db.test.findMany({
      where: {
        batch: {
          teacherId: teacher.id,
        },
      },
      take: 5,
      orderBy: {
        testDate: "desc",
      },
      include: {
        batch: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      batches,
      schedules,
      recentTests,
    });
  } catch (error) {
    console.error("Teacher dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
