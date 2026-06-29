import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dueRecordId, amountPaid, paymentMethod, notes } = await request.json();

    if (!dueRecordId || amountPaid === undefined || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const payAmount = Number(amountPaid);
    if (isNaN(payAmount) || payAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    // Find the due record
    const dueRecord = await db.dueRecord.findUnique({
      where: { id: dueRecordId },
      include: {
        student: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!dueRecord) {
      return NextResponse.json({ error: "Due record not found" }, { status: 404 });
    }

    const newPaidAmount = Number(dueRecord.paidAmount) + payAmount;
    const totalDue = Number(dueRecord.totalDue);

    let status: "PAID" | "PARTIAL" = "PARTIAL";
    if (newPaidAmount >= totalDue) {
      status = "PAID";
    }

    // Use transaction to ensure data consistency
    const [payment, updatedDue] = await db.$transaction([
      // 1. Create Payment
      db.payment.create({
        data: {
          dueRecordId: dueRecord.id,
          studentId: dueRecord.studentId,
          amountPaid: payAmount,
          paymentMethod,
          notes,
        },
      }),
      // 2. Update Due Record
      db.dueRecord.update({
        where: { id: dueRecordId },
        data: {
          paidAmount: newPaidAmount,
          status,
        },
      }),
      // 3. Create Notification for Parent
      db.notification.create({
        data: {
          userId: dueRecord.student.parent.userId,
          title: "Fee Payment Recorded",
          message: `Payment of ₹${payAmount.toLocaleString()} received for ${dueRecord.student.name}'s fee (${new Date(2000, dueRecord.month - 1).toLocaleString("default", { month: "long" })} ${dueRecord.year}). Status: ${status}.`,
        },
      }),
      // 4. Audit Log
      db.auditLog.create({
        data: {
          userId: session.userId,
          action: "RECORD_PAYMENT",
          details: JSON.stringify({
            studentId: dueRecord.studentId,
            dueRecordId,
            amountPaid: payAmount,
            status,
          }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      payment,
      dueRecord: updatedDue,
    });
  } catch (error) {
    console.error("Record payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
