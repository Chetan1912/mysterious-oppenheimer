import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const batchId = searchParams.get("batchId") || "";

    // Build query conditions
    const whereCondition: any = {};

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { admissionId: { contains: search, mode: "insensitive" } },
        { parent: { user: { name: { contains: search, mode: "insensitive" } } } },
      ];
    }

    if (batchId && batchId !== "all") {
      whereCondition.batchId = batchId;
    }

    // Fetch students
    const students = await db.student.findMany({
      where: whereCondition,
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
        feePlan: {
          select: { name: true, amount: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Fetch batches for filter dropdown
    const batches = await db.batch.findMany({
      select: { id: true, name: true },
    });

    return NextResponse.json({ students, batches });
  } catch (error) {
    console.error("Fetch students list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
