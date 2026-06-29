import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const student = await db.student.findUnique({
      where: { id },
      include: {
        batch: {
          select: { name: true },
        },
        parent: {
          select: {
            user: {
              select: { name: true, email: true, phone: true },
            },
          },
        },
        feePlan: true,
        dueRecords: {
          orderBy: [
            { year: "desc" },
            { month: "desc" },
          ],
          include: {
            payments: {
              orderBy: { paymentDate: "desc" },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
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

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 444 });
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Fetch student profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
