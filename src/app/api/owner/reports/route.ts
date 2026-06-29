import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Batch-wise Academic Progress
    const batches = await db.batch.findMany({
      include: {
        students: { select: { id: true } },
        tests: {
          include: {
            marks: { select: { score: true } },
          },
        },
      },
    });

    const batchReports = batches.map((b) => {
      let totalScores = 0;
      let scoreCount = 0;

      b.tests.forEach((t) => {
        t.marks.forEach((m) => {
          totalScores += Number(m.score);
          scoreCount++;
        });
      });

      const batchAverage = scoreCount > 0 ? Number((totalScores / scoreCount).toFixed(1)) : null;

      return {
        id: b.id,
        name: b.name,
        studentCount: b.students.length,
        testCount: b.tests.length,
        averageScore: batchAverage,
      };
    });

    // 2. Month-wise Revenue Summary
    const dueRecords = await db.dueRecord.findMany({
      select: {
        month: true,
        year: true,
        totalDue: true,
        paidAmount: true,
      },
    });

    const monthlyMap: Record<string, { month: number; year: number; expected: number; collected: number; pending: number }> = {};

    dueRecords.forEach((d) => {
      const key = `${d.month}-${d.year}`;
      const total = Number(d.totalDue);
      const paid = Number(d.paidAmount);

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          month: d.month,
          year: d.year,
          expected: 0,
          collected: 0,
          pending: 0,
        };
      }

      monthlyMap[key].expected += total;
      monthlyMap[key].collected += paid;
      monthlyMap[key].pending += (total - paid);
    });

    const revenueReports = Object.values(monthlyMap).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    // 3. Student-wise Financial Summary
    const students = await db.student.findMany({
      include: {
        batch: { select: { name: true } },
        dueRecords: {
          select: {
            totalDue: true,
            paidAmount: true,
          },
        },
      },
    });

    const studentReports = students.map((s) => {
      let totalBilled = 0;
      let totalPaid = 0;

      s.dueRecords.forEach((d) => {
        totalBilled += Number(d.totalDue);
        totalPaid += Number(d.paidAmount);
      });

      return {
        id: s.id,
        name: s.name,
        admissionId: s.admissionId,
        batchName: s.batch ? s.batch.name : "Unassigned",
        totalBilled,
        totalPaid,
        outstanding: totalBilled - totalPaid,
      };
    });

    return NextResponse.json({
      batchReports,
      revenueReports,
      studentReports,
    });
  } catch (error) {
    console.error("Fetch owner reports error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
