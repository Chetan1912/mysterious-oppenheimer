import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parent = await db.parent.findUnique({
      where: { userId: session.userId },
    });

    if (!parent) {
      return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });
    }

    // Fetch children and their schedules
    const children = await db.student.findMany({
      where: { parentId: parent.id },
      include: {
        batch: {
          include: {
            schedules: {
              orderBy: {
                startTime: "asc",
              },
              include: {
                teacher: {
                  include: {
                    user: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ children });
  } catch (error) {
    console.error("Parent schedule API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
