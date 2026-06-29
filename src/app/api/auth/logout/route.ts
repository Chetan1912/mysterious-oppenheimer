import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookie, getSession } from "@/lib/auth";
import db from "@/lib/db";

export async function POST() {
  const session = await getSession();
  
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  clearAuthCookie(response);

  if (session) {
    // Log logout action (non-blocking)
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: "USER_LOGOUT",
        details: JSON.stringify({ email: session.email }),
      },
    }).catch(console.error);
  }

  return response;
}
