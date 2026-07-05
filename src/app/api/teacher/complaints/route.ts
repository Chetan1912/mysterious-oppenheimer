import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId") || "";

    // Find teacher
    const teacher = await db.teacher.findUnique({
      where: { userId: session.userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    // 1. If batchId is provided, return students for that batch
    if (batchId) {
      const students = await db.student.findMany({
        where: { batchId },
        select: { id: true, name: true, admissionId: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ students });
    }

    // 2. If no batchId, return all batches and historical complaints filed by this teacher
    const batches = await db.batch.findMany({
      where: { teacherId: teacher.id },
      select: { id: true, name: true },
    });

    const logs = await db.auditLog.findMany({
      where: {
        userId: session.userId,
        action: "STUDENT_COMPLAINT",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const complaints = logs.map((log) => {
      try {
        const detailsObj = JSON.parse(log.details || "{}");
        return {
          id: log.id,
          createdAt: log.createdAt,
          ...detailsObj,
        };
      } catch (e) {
        return {
          id: log.id,
          createdAt: log.createdAt,
          title: "Complaint Info",
          description: log.details || "",
        };
      }
    });

    return NextResponse.json({ batches, complaints });
  } catch (error) {
    console.error("Fetch complaints error:", error);
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

    const { studentId, title, description } = await request.json();

    if (!studentId || !title || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch teacher's user record for their name
    const teacherUser = await db.user.findUnique({
      where: { id: session.userId },
      select: { name: true },
    });
    const teacherName = teacherUser ? teacherUser.name : "Teacher";

    // Fetch student, including parent and batch details
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        batch: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const parentUserId = student.parent.user.id;

    // 1. Create notification for parent
    await db.notification.create({
      data: {
        userId: parentUserId,
        title: `Academic/Behavioral Complaint - ${student.name}`,
        message: `${title}: ${description} (Filed by Teacher: ${teacherName})`,
      },
    });

    // 2. Create Audit Log for record-keeping
    const complaint = await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "STUDENT_COMPLAINT",
        details: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          batchName: student.batch ? student.batch.name : "N/A",
          title,
          description,
          parentName: student.parent.user.name,
          parentEmail: student.parent.user.email,
        }),
      },
    });

    return NextResponse.json({ success: true, complaint });
  } catch (error) {
    console.error("Create complaint error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
