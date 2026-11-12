import type { Metadata } from "next";
import { DashboardShell } from "../../components/dashboard/DashboardShell";
import "./dashboard.css";
import "./teacher.css";

// The three faces are declared in app/layout.tsx and their variables land on
// <html>, so the console and the live surface at "/" read the same type. This
// layout only carries the console chrome (DashboardShell) and its own document
// title.

export const metadata: Metadata = {
  title: "Cuộc họp — MeetMate",
  description:
    "Trợ lý nghiên cứu cuộc họp: nghe họp Google Meet, tách chủ đề, tìm nguồn thật và gửi vào chat.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
