import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch batches and fee plans to populate the form dropdowns
    const batches = await db.batch.findMany({
      select: { id: true, name: true },
    });

    const feePlans = await db.feePlan.findMany({
      select: { id: true, name: true, amount: true },
    });

    return NextResponse.json({ batches, feePlans });
  } catch (error) {
    console.error("Fetch admission form data error:", error);
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
    const {
      studentName,
      parentName,
      parentEmail,
      parentPhone,
      address,
      notes,
      batchId,
      feePlanId,
      joiningDate,
    } = body;

    // Validate required fields
    if (!studentName || !parentName || !parentEmail || !batchId || !feePlanId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Check if parent user already exists
    let parent = await db.parent.findFirst({
      where: {
        user: {
          email: parentEmail.toLowerCase(),
        },
      },
      include: {
        user: true,
      },
    });

    // If parent doesn't exist, create user and parent record
    if (!parent) {
      const defaultPassword = "parent123";
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      const user = await db.user.create({
        data: {
          email: parentEmail.toLowerCase(),
          passwordHash,
          name: parentName,
          role: "PARENT",
          phone: parentPhone,
        },
      });

      parent = await db.parent.create({
        data: {
          userId: user.id,
        },
        include: {
          user: true,
        },
      });
    }

    // 2. Generate sequential Admission ID
    const currentYear = new Date().getFullYear();
    const studentCount = await db.student.count();
    const nextSeq = String(studentCount + 1).padStart(3, "0");
    const admissionId = `APEX-${currentYear}-${nextSeq}`;

    // 3. Create Student
    const student = await db.student.create({
      data: {
        admissionId,
        name: studentName,
        parentId: parent.id,
        batchId: batchId || null,
        feePlanId: feePlanId || null,
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        address: address || null,
        notes: notes || null,
      },
    });

    // 4. Generate first monthly fee due record for this student
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const dueYear = now.getFullYear();

    const plan = await db.feePlan.findUnique({
      where: { id: feePlanId },
    });

    if (plan) {
      await db.dueRecord.create({
        data: {
          studentId: student.id,
          month: currentMonth,
          year: dueYear,
          baseAmount: plan.amount,
          totalDue: plan.amount,
          paidAmount: 0.00,
          status: "PENDING",
        },
      }).catch(err => console.error("Error creating initial due record:", err));
    }

    // 5. Audit Log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_STUDENT",
        details: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          admissionId,
          parentId: parent.id,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      student,
      parentCreated: !body.parentExists,
    });
  } catch (error) {
    console.error("Student admission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
