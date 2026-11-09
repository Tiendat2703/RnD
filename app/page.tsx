import { redirect } from "next/navigation";

// Trang `/` từng là một "phòng họp" giả lập; theo dõi trực tiếp giờ nằm trong panel
// của extension ngay trong Meet, nên `/` chỉ đưa người dùng tới danh sách cuộc họp.
export default function Home() {
  redirect("/dashboard/callSessions");
}
