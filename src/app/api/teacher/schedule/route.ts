import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const schedules = await db.schedule.findMany({
      where: { teacherId: teacher.id },
      include: {
        batch: {
          select: { name: true },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });

    const batches = await db.batch.findMany({
      where: { teacherId: teacher.id },
      select: { id: true, name: true },
    });

    return NextResponse.json({ schedules, batches });
  } catch (error) {
    console.error("Fetch teacher schedule error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const teacher = await db.teacher.findUnique({
      where: { userId: session.userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { batchId, startTime, endTime, isExtraClass, notes, scheduleId, isCancelled } = body;

    // If scheduleId is provided, we are updating (rescheduling or cancelling)
    if (scheduleId) {
      const existing = await db.schedule.findUnique({
        where: { id: scheduleId },
        include: {
          batch: {
            include: {
              students: {
                include: { parent: true },
              },
            },
          },
        },
      });

      if (!existing || existing.teacherId !== teacher.id) {
        return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
      }

      const updated = await db.schedule.update({
        where: { id: scheduleId },
        data: {
          startTime: startTime ? new Date(startTime) : existing.startTime,
          endTime: endTime ? new Date(endTime) : existing.endTime,
          isCancelled: isCancelled !== undefined ? isCancelled : existing.isCancelled,
          notes: notes !== undefined ? notes : existing.notes,
        },
      });

      // Notify parents of the update
      const parentsToNotify = existing.batch.students.map((s) => s.parent.userId);
      const uniqueParents = Array.from(new Set(parentsToNotify));

      const notifications = uniqueParents.map((parentUserId) =>
        db.notification.create({
          data: {
            userId: parentUserId,
            title: isCancelled ? "Class Cancelled Notice" : "Class Rescheduled Notice",
            message: isCancelled
              ? `The class for ${existing.batch.name} scheduled on ${new Date(existing.startTime).toLocaleDateString()} has been cancelled.`
              : `The class for ${existing.batch.name} has been rescheduled to ${new Date(startTime).toLocaleString()}.`,
          },
        })
      );

      await db.$transaction(notifications);

      // Audit Log
      await db.auditLog.create({
        data: {
          userId: session.userId,
          action: isCancelled ? "CANCEL_CLASS" : "RESCHEDULE_CLASS",
          details: JSON.stringify({ scheduleId, batchName: existing.batch.name }),
        },
      });

      return NextResponse.json({ success: true, schedule: updated });
    }

    // Creating a new class schedule
    if (!batchId || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: {
        students: {
          include: { parent: true },
        },
      },
    });

    if (!batch || batch.teacherId !== teacher.id) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const newSchedule = await db.schedule.create({
      data: {
        batchId,
        teacherId: teacher.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isExtraClass: !!isExtraClass,
        notes: notes || null,
      },
    });

    // Notify parents
    const parentsToNotify = batch.students.map((s) => s.parent.userId);
    const uniqueParents = Array.from(new Set(parentsToNotify));

    const notifications = uniqueParents.map((parentUserId) =>
      db.notification.create({
        data: {
          userId: parentUserId,
          title: isExtraClass ? "New Extra Class Scheduled" : "New Class Scheduled",
          message: `A new ${isExtraClass ? "extra " : ""}class for ${batch.name} has been scheduled on ${new Date(startTime).toLocaleString()}.`,
        },
      })
    );

    await db.$transaction(notifications);

    // Audit Log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_SCHEDULE",
        details: JSON.stringify({
          scheduleId: newSchedule.id,
          batchName: batch.name,
          isExtraClass,
        }),
      },
    });

    return NextResponse.json({ success: true, schedule: newSchedule });
  } catch (error) {
    console.error("Create/Update schedule error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
