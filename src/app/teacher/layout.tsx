import React from "react";
import DashboardLayout from "@/components/DashboardLayout";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout title="Teacher Portal">{children}</DashboardLayout>;
}
