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

    // Fetch children and their marks history
    const children = await db.student.findMany({
      where: { parentId: parent.id },
      include: {
        marks: {
          include: {
            test: true,
          },
          orderBy: {
            test: {
              testDate: "desc",
            },
          },
        },
      },
    });

    return NextResponse.json({ children });
  } catch (error) {
    console.error("Parent reports API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
