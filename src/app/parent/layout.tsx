import React from "react";
import DashboardLayout from "@/components/DashboardLayout";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout title="Parent Portal">{children}</DashboardLayout>;
}
