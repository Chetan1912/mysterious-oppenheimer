"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import styles from "./DashboardLayout.module.css";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Let middleware handle redirect
  }

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className={styles.contentWrapper}>
        <Header onMenuClick={() => setIsSidebarOpen(true)} title={title} />
        
        <main className={styles.mainContent}>
          <div className="fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
