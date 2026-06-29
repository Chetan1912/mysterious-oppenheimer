import React from "react";
import DashboardLayout from "@/components/DashboardLayout";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout title="Owner Portal">{children}</DashboardLayout>;
}
