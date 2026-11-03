"use client";

// components/dashboard/NewMeetingButton.tsx — CTA chính của topbar.
//
// Không còn là nút split: nửa còn lại của split liệt kê ba loại phiên theo kiểu
// nghề nghiệp (Interview/Regular/Mock) — một danh mục của sản phẩm khác. Loại
// cuộc họp là một bước bên trong wizard, không phải một cánh cửa riêng.
import { useDashboard } from "./DashboardContext";
import { IconPlus } from "./icons";

export function NewMeetingButton() {
  const { openWizard } = useDashboard();
  return (
    <button className="btn btn--primary" aria-label="Cuộc họp mới" onClick={() => openWizard()}>
      <IconPlus />
      <span className="split__label">Cuộc họp mới</span>
    </button>
  );
}
