import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // 1. Total Students Count
    const studentCount = await db.student.count();

    // 2. Active Batches Count
    const batchCount = await db.batch.count();

    // 3. Current Month Fees Collected
    const collectionsResult = await db.dueRecord.aggregate({
      where: {
        month: currentMonth,
        year: currentYear,
      },
      _sum: {
        paidAmount: true,
      },
    });
    const monthlyCollections = Number(collectionsResult._sum.paidAmount || 0);

    // 4. Total Overdue / Outstanding Fees
    const overdueResult = await db.dueRecord.findMany({
      where: {
        status: {
          in: ["PENDING", "PARTIAL", "OVERDUE"],
        },
      },
      select: {
        totalDue: true,
        paidAmount: true,
      },
    });
    const totalOutstanding = overdueResult.reduce(
      (acc, curr) => acc + (Number(curr.totalDue) - Number(curr.paidAmount)),
      0
    );

    // 5. Recent Payments
    const recentPayments = await db.payment.findMany({
      take: 5,
      orderBy: {
        paymentDate: "desc",
      },
      include: {
        student: {
          select: {
            name: true,
            admissionId: true,
          },
        },
      },
    });

    // 6. Overdue Accounts (to display on dashboard for quick reminders)
    const overdueAccounts = await db.dueRecord.findMany({
      where: {
        status: {
          in: ["PENDING", "PARTIAL", "OVERDUE"],
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            admissionId: true,
            parent: {
              select: {
                user: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
    });

    // 7. Recent Notices
    const recentNotices = await db.notice.findMany({
      take: 3,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      metrics: {
        studentCount,
        batchCount,
        monthlyCollections,
        totalOutstanding,
      },
      recentPayments,
      overdueAccounts,
      recentNotices,
    });
  } catch (error) {
    console.error("Owner dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
