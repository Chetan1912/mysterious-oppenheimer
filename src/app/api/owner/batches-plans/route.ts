import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all batches with handles/teacher
    const batches = await db.batch.findMany({
      include: {
        teacher: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch all fee plans
    const feePlans = await db.feePlan.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch all teachers to let owners assign a teacher
    const teachers = await db.teacher.findMany({
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ batches, feePlans, teachers });
  } catch (error) {
    console.error("Fetch batches and plans error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    if (type === "batch") {
      const { name, description, teacherId } = body;

      if (!name) {
        return NextResponse.json(
          { error: "Batch name is required" },
          { status: 400 }
        );
      }

      const batch = await db.batch.create({
        data: {
          name,
          description: description || null,
          teacherId: teacherId || null,
        },
      });

      // Audit Log
      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: "CREATE_BATCH",
          details: JSON.stringify({
            batchId: batch.id,
            batchName: batch.name,
            teacherId: batch.teacherId,
          }),
        },
      });

      return NextResponse.json({ success: true, batch });
    } else if (type === "plan") {
      const { name, amount, dueDateDay, lateFeeRule } = body;

      if (!name || amount === undefined || dueDateDay === undefined) {
        return NextResponse.json(
          { error: "Name, amount, and due date day are required" },
          { status: 400 }
        );
      }

      const numAmount = Number(amount);
      const numDueDate = parseInt(dueDateDay);
      const numLateFee = lateFeeRule ? Number(lateFeeRule) : 0;

      if (isNaN(numAmount) || numAmount < 0) {
        return NextResponse.json(
          { error: "Amount must be a non-negative number" },
          { status: 400 }
        );
      }

      if (isNaN(numDueDate) || numDueDate < 1 || numDueDate > 31) {
        return NextResponse.json(
          { error: "Due date day must be between 1 and 31" },
          { status: 400 }
        );
      }

      const feePlan = await db.feePlan.create({
        data: {
          name,
          amount: numAmount,
          dueDateDay: numDueDate,
          lateFeeRule: numLateFee,
        },
      });

      // Audit Log
      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: "CREATE_FEE_PLAN",
          details: JSON.stringify({
            feePlanId: feePlan.id,
            feePlanName: feePlan.name,
            amount: numAmount,
          }),
        },
      });

      return NextResponse.json({ success: true, feePlan });
    } else {
      return NextResponse.json(
        { error: "Invalid action type" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Create batch or plan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
