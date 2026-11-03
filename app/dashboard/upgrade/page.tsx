import { UpgradePanel } from "../../../components/dashboard/UpgradePanel";

// app/dashboard/upgrade/page.tsx — the pricing surface as a route, the way the
// competitor's /dashboard/upgrade is one. The shell's topbar already carries the
// page title, so the panel starts at the offer bar rather than repeating a heading.
export default function UpgradePage() {
  return <UpgradePanel />;
}
