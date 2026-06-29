import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notices = await db.notice.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ notices });
  } catch (error) {
    console.error("Fetch notices error:", error);
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

    const { title, content, targetRoles } = await request.json();

    if (!title || !content || !Array.isArray(targetRoles) || targetRoles.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the notice
    const notice = await db.notice.create({
      data: {
        title,
        content,
        targetRoles,
      },
    });

    // Create in-app notifications for all targeted users
    const users = await db.user.findMany({
      where: {
        role: {
          in: targetRoles,
        },
      },
      select: { id: true },
    });

    const notifications = users.map((user) =>
      db.notification.create({
        data: {
          userId: user.id,
          title: `Announcement: ${title}`,
          message: content,
        },
      })
    );

    await db.$transaction(notifications);

    // Audit Log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "CREATE_NOTICE",
        details: JSON.stringify({ noticeId: notice.id, title }),
      },
    });

    return NextResponse.json({ success: true, notice });
  } catch (error) {
    console.error("Create notice error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
