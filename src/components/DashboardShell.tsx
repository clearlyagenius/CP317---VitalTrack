"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";

export default function DashboardShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar userName={userName} onChatClick={() => setChatOpen(true)} />
      <main className="dashboard-content">{children}</main>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}