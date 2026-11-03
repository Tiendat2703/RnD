"use client";

// components/dashboard/DashboardContext.tsx — state dùng chung cho dashboard.
//
// Đơn vị đếm là phiên họp / lượt kiểm chứng / artifact (bảng giá IV.3.1), không
// phải tín dụng. Không có hàm nào trừ tiền: gói chưa mở bán.

import { createContext, useContext } from "react";
import type { MeetingKind, MeetingLine, MeetingRecord, ResearchPrefs } from "../../lib/dashboardData";

/** "auto" follows the OS; the shell resolves it to a real theme before painting. */
export type Theme = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";
export type ToastKind = "success" | "error";
/** the live monitor is pinned to dark chrome; the wizard follows the user theme */
export type PrefsFrom = "live" | "wizard";
/** gói được nhấn khi mở /dashboard/upgrade */
export type PlanId = "free" | "pro" | "team" | "edu";

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

/** Hạn mức gói Free còn lại, tính bằng đơn vị của bảng giá. */
export interface Quota {
  meetingsLeft: number;
  verificationsLeft: number;
  artifactsLeft: number;
}

/** Cuộc họp đang hiển thị trong monitor (dark chrome). */
export interface LiveState {
  meetingId: string;
  title: string;
  kind: MeetingKind;
  /** giây đã tích trước lần chạy này (rời phiên không xoá đồng hồ) */
  elapsedAtLeave: number;
  /** epoch ms lúc bắt đầu chạy hiện tại */
  startedRunAt: number;
  /** số chủ đề đã phát hiện trong phiên */
  topicCount: number;
  /** số nguồn đã gửi vào chat */
  sourceCount: number;
}

/** Bản nháp mang từ wizard sang dialog cài tiện ích, trước khi phiên tồn tại. */
export interface PendingMeeting {
  title: string;
  kind: MeetingKind;
}

export interface WizardState {
  open: boolean;
  /** khi có, wizard sửa một phiên đã có thay vì tạo mới */
  editId?: string;
  /** preset để bước một mở sẵn đúng loại */
  kind?: MeetingKind;
}

export interface DashboardContextValue {
  /** the user's choice, which may be "auto" */
  theme: Theme;
  /** what the shell is actually painting */
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
  meetings: MeetingRecord[];
  renameMeeting: (id: string, title: string) => void;
  deleteMeeting: (id: string) => void;
  clearMeetings: () => void;
  addMeeting: (m: MeetingRecord) => void;
  updateMeeting: (id: string, patch: Partial<MeetingRecord>) => void;

  quota: Quota;
  /** một lượt nghiên cứu + kiểm chứng cho một chủ đề */
  useVerification: (n?: number) => void;
  /** một artifact được xuất từ kết quả của phiên */
  useArtifact: () => void;

  planFocus: PlanId;
  setPlanFocus: (p: PlanId) => void;
  /** đi tới /dashboard/upgrade, có thể nhấn một gói; pricing là route, không phải frame */
  openPricing: (plan?: PlanId) => void;

  /** the ≤900px sidebar drawer — a docked helper has to yield to it like any modal */
  navOpen: boolean;
  pushToast: (message: string, kind?: ToastKind) => void;

  /* --- lifecycle: họp mới → cài tiện ích → monitor → rời/kết thúc --- */
  prefs: ResearchPrefs;
  setPrefs: (patch: Partial<ResearchPrefs>) => void;
  wizard: WizardState;
  openWizard: (editId?: string, kind?: MeetingKind) => void;
  closeWizard: () => void;
  installFor: PendingMeeting | null;
  requestInstall: (draft: PendingMeeting) => void;
  cancelInstall: () => void;
  live: LiveState | null;
  startLive: (draft: PendingMeeting, meetingId: string) => void;
  rejoinLive: (m: MeetingRecord) => void;
  leaveLive: (elapsedSec: number) => void;
  endLive: (elapsedSec: number) => void;
  liveLines: MeetingLine[];
  pushLiveLine: (line: MeetingLine) => void;
  clearLiveLines: () => void;
  transcripts: Record<string, MeetingLine[]>;
  prefsOpen: boolean;
  prefsFrom: PrefsFrom;
  setPrefsOpen: (open: boolean, from?: PrefsFrom) => void;
  detailOf: { meeting: MeetingRecord; tab: string } | null;
  openDetail: (m: MeetingRecord, tab?: string) => void;
  closeDetail: () => void;
}

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardShell");
  return ctx;
}
