import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find parent record
    const parent = await db.parent.findUnique({
      where: { userId: session.userId },
    });

    if (!parent) {
      return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
    }

    // 1. Fetch Children (Students)
    const children = await db.student.findMany({
      where: { parentId: parent.id },
      include: {
        batch: {
          select: { name: true },
        },
        feePlan: true,
      },
    });

    // 2. Fetch specific details for each child
    const childrenData = [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    for (const child of children) {
      // Outstanding fees
      const outstandingDues = await db.dueRecord.findMany({
        where: {
          studentId: child.id,
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
        },
      });
      const totalPending = outstandingDues.reduce(
        (acc, curr) => acc + (Number(curr.totalDue) - Number(curr.paidAmount)),
        0
      );

      // Recent test marks (last 3)
      const recentMarks = await db.marks.findMany({
        where: { studentId: child.id },
        take: 3,
        orderBy: {
          test: {
            testDate: "desc",
          },
        },
        include: {
          test: true,
        },
      });

      // Today's schedule
      const todaySchedule = child.batchId
        ? await db.schedule.findMany({
            where: {
              batchId: child.batchId,
              startTime: {
                gte: todayStart,
                lte: todayEnd,
              },
            },
            orderBy: {
              startTime: "asc",
            },
          })
        : [];

      childrenData.push({
        student: child,
        totalPending,
        recentMarks,
        todaySchedule,
      });
    }

    // 3. Fetch Notices for Parents
    const notices = await db.notice.findMany({
      where: {
        targetRoles: {
          has: "PARENT",
        },
      },
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      children: childrenData,
      notices,
    });
  } catch (error) {
    console.error("Parent dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
