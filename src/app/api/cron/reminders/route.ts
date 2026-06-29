import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { sendEmail } from "@/lib/mailer";

const CRON_SECRET = process.env.CRON_SECRET || "fallback_cron_secret_token_2026";

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  try {
    // 1. Verify Authorization
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // 2. Fetch all unpaid/partial due records that are overdue
    // Overdue means: current day is past the FeePlan's dueDateDay
    const pendingDues = await db.dueRecord.findMany({
      where: {
        status: {
          in: ["PENDING", "PARTIAL", "OVERDUE"],
        },
      },
      include: {
        student: {
          include: {
            parent: {
              include: { user: true },
            },
            feePlan: true,
          },
        },
      },
    });

    let remindersSent = 0;
    let ownerAlerts = 0;

    for (const due of pendingDues) {
      const plan = due.student.feePlan;
      if (!plan) continue;

      // Check if due date has passed
      // Due date is determined by the dueRecord's year and month, and the fee plan's dueDateDay
      const dueDate = new Date(due.year, due.month - 1, plan.dueDateDay, 23, 59, 59);

      if (now <= dueDate) {
        continue; // Not overdue yet
      }

      // If overdue and status is PENDING, apply late fee and transition status to OVERDUE
      if (due.status === "PENDING") {
        await db.dueRecord.update({
          where: { id: due.id },
          data: {
            status: "OVERDUE",
            lateFee: plan.lateFeeRule,
            totalDue: Number(plan.amount) + Number(plan.lateFeeRule),
          },
        });
        due.status = "OVERDUE";
        due.totalDue = plan.amount.add(plan.lateFeeRule);
      }

      // Calculate balance
      const balance = Number(due.totalDue) - Number(due.paidAmount);
      if (balance <= 0) continue;

      // Check if we should send a reminder (never sent, or sent >= 5 days ago)
      const lastSent = due.lastReminder ? new Date(due.lastReminder) : null;
      const daysSinceLastReminder = lastSent
        ? (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24)
        : null;

      if (lastSent === null || (daysSinceLastReminder !== null && daysSinceLastReminder >= 5)) {
        const parentUser = due.student.parent.user;
        const monthName = new Date(2000, due.month - 1).toLocaleString("default", { month: "long" });

        // Send Email
        const emailSent = await sendReminderEmail(
          parentUser.email,
          parentUser.name,
          due.student.name,
          monthName,
          due.year,
          balance
        );

        if (emailSent) {
          remindersSent++;

          // Increment reminder count and update lastReminder
          const newReminderCount = due.reminderCount + 1;

          await db.dueRecord.update({
            where: { id: due.id },
            data: {
              lastReminder: now,
              reminderCount: newReminderCount,
            },
          });

          // Create Parent In-App Notification
          await db.notification.create({
            data: {
              userId: parentUser.id,
              title: "Fee Payment Overdue Notice",
              message: `Friendly reminder: The fee of ₹${balance.toLocaleString()} for ${due.student.name} (${monthName} ${due.year}) is overdue. Please clear it.`,
            },
          });

          // If reminder count is 3 (15 days overdue), alert the Owner
          if (newReminderCount >= 3) {
            ownerAlerts++;
            // Find owner user
            const owner = await db.user.findFirst({
              where: { role: "OWNER" },
            });

            if (owner) {
              await db.notification.create({
                data: {
                  userId: owner.id,
                  title: "Action Required: High Overdue Balance",
                  message: `Fee for ${due.student.name} is 15+ days overdue (Sent ${newReminderCount} reminders). Balance: ₹${balance.toLocaleString()}.`,
                },
              });
            }
          }
        }
      }
    }

    // 3. Log Cron run in Audit Log
    if (remindersSent > 0 || ownerAlerts > 0) {
      await db.auditLog.create({
        data: {
          userId: "system-cron-job", // System ID
          action: "AUTOMATED_REMINDERS_CRON",
          details: JSON.stringify({
            remindersSent,
            ownerAlerts,
            timestamp: now.toISOString(),
          }),
        },
      }).catch(err => console.error("Error writing cron audit log:", err));
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      ownerAlerts,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Cron reminders error:", error);
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
  balance: number
): Promise<boolean> {
  const subject = `Fee Overdue Notice: ${month} ${year} - Apex Academy`;

  const text = `Dear ${parentName},\n\nThis is an automated notice that the tuition fee of ₹${balance.toLocaleString()} for ${studentName} for the month of ${month} ${year} is currently overdue.\n\nPlease arrange for the payment as soon as possible. If you have already paid, please ignore this message.\n\nBest regards,\nApex Academy`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 8px; padding: 2rem;">
      <h2 style="color: #b91c1c; border-bottom: 2px solid #fee2e2; padding-bottom: 0.5rem; margin-top: 0;">Apex Academy - Overdue Notice</h2>
      <p>Dear <strong>${parentName}</strong>,</p>
      <p>We would like to bring to your attention that the tuition fee for <strong>${studentName}</strong> for the billing period of <strong>${month} ${year}</strong> is currently overdue.</p>
      
      <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 1.25rem; margin: 1.5rem 0;">
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="color: #4f5e74; padding-bottom: 0.5rem;">Student Name:</td>
            <td style="font-weight: bold; text-align: right; padding-bottom: 0.5rem;">${studentName}</td>
          </tr>
          <tr>
            <td style="color: #4f5e74; padding-bottom: 0.5rem;">Billing Period:</td>
            <td style="font-weight: bold; text-align: right; padding-bottom: 0.5rem;">${month} ${year}</td>
          </tr>
          <tr style="font-size: 16px; border-top: 1px solid #fca5a5;">
            <td style="color: #0f172a; font-weight: bold; padding-top: 0.5rem;">Overdue Balance:</td>
            <td style="color: #b91c1c; font-weight: bold; text-align: right; padding-top: 0.5rem;">₹${balance.toLocaleString()}</td>
          </tr>
        </table>
      </div>
      
      <p>Please clear the outstanding amount via UPI (<strong>apex@okhdfcbank</strong>) or bank transfer at your earliest convenience. Thank you for your cooperation.</p>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
        This is an automated reminder. If you have already made the payment, please contact the owner to record the transaction.
      </p>
    </div>
  `;

  return await sendEmail({ to, subject, text, html });
}
