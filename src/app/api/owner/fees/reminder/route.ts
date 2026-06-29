import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";
import { sendEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dueRecordId, action } = await request.json();

    if (action === "run_all") {
      // Batch send reminders to all unpaid/overdue records
      const overdueDues = await db.dueRecord.findMany({
        where: {
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
        },
        include: {
          student: {
            include: {
              parent: {
                include: { user: true },
              },
            },
          },
        },
      });

      let sentCount = 0;

      for (const due of overdueDues) {
        const parentUser = due.student.parent.user;
        const balance = Number(due.totalDue) - Number(due.paidAmount);
        const monthName = new Date(2000, due.month - 1).toLocaleString("default", { month: "long" });

        const emailSent = await sendReminderEmail(
          parentUser.email,
          parentUser.name,
          due.student.name,
          monthName,
          due.year,
          balance,
          due.id
        );

        if (emailSent) {
          // Update due record
          await db.dueRecord.update({
            where: { id: due.id },
            data: {
              lastReminder: new Date(),
              reminderCount: { increment: 1 },
            },
          });

          // Create in-app notification
          await db.notification.create({
            data: {
              userId: parentUser.id,
              title: "Fee Outstanding Notice",
              message: `Friendly reminder: A balance of ₹${balance.toLocaleString()} is outstanding for ${due.student.name}'s fee (${monthName} ${due.year}). Please clear it at your earliest convenience.`,
            },
          });

          sentCount++;
        }
      }

      // Log audit action
      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: "SEND_BATCH_REMINDERS",
          details: JSON.stringify({ count: sentCount }),
        },
      });

      return NextResponse.json({ success: true, message: `Sent ${sentCount} reminders.` });
    }

    if (!dueRecordId) {
      return NextResponse.json({ error: "Missing dueRecordId" }, { status: 400 });
    }

    // Single reminder
    const due = await db.dueRecord.findUnique({
      where: { id: dueRecordId },
      include: {
        student: {
          include: {
            parent: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!due) {
      return NextResponse.json({ error: "Due record not found" }, { status: 404 });
    }

    const parentUser = due.student.parent.user;
    const balance = Number(due.totalDue) - Number(due.paidAmount);
    const monthName = new Date(2000, due.month - 1).toLocaleString("default", { month: "long" });

    const emailSent = await sendReminderEmail(
      parentUser.email,
      parentUser.name,
      due.student.name,
      monthName,
      due.year,
      balance,
      due.id
    );

    if (emailSent) {
      await db.dueRecord.update({
        where: { id: due.id },
        data: {
          lastReminder: new Date(),
          reminderCount: { increment: 1 },
        },
      });

      await db.notification.create({
        data: {
          userId: parentUser.id,
          title: "Fee Outstanding Notice",
          message: `Friendly reminder: A balance of ₹${balance.toLocaleString()} is outstanding for ${due.student.name}'s fee (${monthName} ${due.year}).`,
        },
      });

      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: "SEND_SINGLE_REMINDER",
          details: JSON.stringify({
            dueRecordId,
            studentName: due.student.name,
            balance,
          }),
        },
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }
  } catch (error) {
    console.error("Manual reminder API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function sendReminderEmail(
  to: string,
  parentName: string,
  studentName: string,
  month: string,
  year: number,
  balance: number,
  dueId: string
): Promise<boolean> {
  const subject = `Fee Payment Reminder: ${month} ${year} - Apex Academy`;

  const text = `Dear ${parentName},\n\nThis is a friendly reminder that a balance of ₹${balance.toLocaleString()} remains outstanding for ${studentName}'s tuition fee for the month of ${month} ${year}.\n\nPlease arrange for the payment at your earliest convenience. If you have already made the payment, please ignore this email.\n\nBest regards,\nApex Academy Management`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 2rem;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e0e7ff; padding-bottom: 0.5rem; margin-top: 0;">Apex Academy</h2>
      <p>Dear <strong>${parentName}</strong>,</p>
      <p>This is a friendly reminder regarding the outstanding tuition fee for your child, <strong>${studentName}</strong>, for the month of <strong>${month} ${year}</strong>.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1.25rem; margin: 1.5rem 0;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="color: #64748b; padding-bottom: 0.5rem;">Student Name:</td>
            <td style="font-weight: bold; text-align: right; padding-bottom: 0.5rem;">${studentName}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding-bottom: 0.5rem;">Billing Period:</td>
            <td style="font-weight: bold; text-align: right; padding-bottom: 0.5rem;">${month} ${year}</td>
          </tr>
          <tr style="font-size: 16px; border-top: 1px solid #cbd5e1;">
            <td style="color: #0f172a; font-weight: bold; padding-top: 0.5rem;">Outstanding Balance:</td>
            <td style="color: #b91c1c; font-weight: bold; text-align: right; padding-top: 0.5rem;">₹${balance.toLocaleString()}</td>
          </tr>
        </table>
      </div>
      
      <p>Please arrange for the payment via GPay/PhonePe or Bank Transfer. Once paid, please update the details or share the receipt with us.</p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 2rem; border-top: 1px solid #cbd5e1; padding-top: 1rem;">
        If you have already paid or believe this is in error, please ignore this email or contact the institute owner directly.
      </p>
    </div>
  `;

  return await sendEmail({ to, subject, text, html });
}
