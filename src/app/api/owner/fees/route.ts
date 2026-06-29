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
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const month = searchParams.get("month") || "";
    const year = searchParams.get("year") || "";

    const whereCondition: any = {};

    if (search) {
      whereCondition.student = {
        name: { contains: search, mode: "insensitive" },
      };
    }

    if (status && status !== "all") {
      whereCondition.status = status;
    }

    if (month && month !== "all") {
      whereCondition.month = parseInt(month, 10);
    }

    if (year && year !== "all") {
      whereCondition.year = parseInt(year, 10);
    }

    // Fetch due records
    const dueRecords = await db.dueRecord.findMany({
      where: whereCondition,
      include: {
        student: {
          select: {
            name: true,
            admissionId: true,
            batch: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { student: { name: "asc" } },
      ],
    });

    // Calculate overall metrics
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const allDues = await db.dueRecord.findMany({
      select: {
        month: true,
        year: true,
        totalDue: true,
        paidAmount: true,
        status: true,
      },
    });

    let collectedThisMonth = 0;
    let pendingThisMonth = 0;
    let totalOverdue = 0;

    allDues.forEach((d) => {
      const total = Number(d.totalDue);
      const paid = Number(d.paidAmount);
      const balance = total - paid;

      if (d.month === currentMonth && d.year === currentYear) {
        collectedThisMonth += paid;
        pendingThisMonth += balance;
      }

      if (d.status === "OVERDUE" || (d.status === "PARTIAL" && balance > 0 && (d.year < currentYear || (d.year === currentYear && d.month < currentMonth)))) {
        totalOverdue += balance;
      }
    });

    return NextResponse.json({
      dueRecords,
      summary: {
        collectedThisMonth,
        pendingThisMonth,
        totalOverdue,
      },
    });
  } catch (error) {
    console.error("Fetch fee ledger error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
