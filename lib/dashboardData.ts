// lib/dashboardData.ts — dữ liệu mô phỏng cho MeetMateAI web console.
//
// Mọi con số ở đây lấy từ hai nguồn, không nguồn nào là của đối thủ:
// - Hạn mức và giá: bản mô tả RTS2026, mục IV.3.1 (bảng giá dự kiến).
// - Giới hạn kỹ thuật: `2026-11-01-meetmate-extension.md`, và `lib/types.ts`
//   là nơi duy nhất khai báo chúng.
//
// Đây vẫn là dữ liệu mẫu: extension chưa ghi được phiên nào thật. Vì vậy mọi
// nhãn tiền đều phải đọc được thành "dự kiến / minh họa", không thành hoá đơn.

import type {
  MeetingKind,
  MeetingLine,
  MeetingRecord,
  ResearchResult,
  Topic,
} from "./types";
import { LIMITS } from "./types";

export type { MeetingKind, MeetingLine, MeetingRecord } from "./types";
export {
  DEGRADED_TEXT,
  LIMITS,
  MEETING_KIND_LABEL,
  PIPELINE_LABEL,
} from "./types";

/* ------------------------------------------------------------------ */
/* Hạn mức gói Free (bảng giá IV.3.1)                                  */
/* ------------------------------------------------------------------ */

// Free không giới hạn theo phút mà theo ba đơn vị: phiên họp có AI, lượt kiểm
// chứng, và artifact. Card hết hạn mức phải nói rõ hết cái nào — "hết lượt kiểm
// chứng giữa cuộc họp" chính là điểm chạm nâng cấp thứ nhất trong tài liệu.
export const FREE_PLAN = {
  meetings: 3,
  meetingCapMin: 45,
  verifications: 10,
  artifacts: 1,
} as const;

/* ------------------------------------------------------------------ */
/* Cuộc họp                                                            */
/* ------------------------------------------------------------------ */

export const initialMeetings: MeetingRecord[] = [
  {
    id: "m-01",
    title: "Bảng giá gói SME",
    kind: "san-pham",
    startedAt: "2026-11-01T09:40:00",
    durationSec: 1440,
    topicCount: 4,
    sourceCount: 11,
    status: "live",
  },
  {
    id: "m-02",
    title: "Nghiên cứu khách hàng: nhóm product",
    kind: "nghien-cuu",
    startedAt: "2026-11-01T08:15:00",
    durationSec: 2520,
    topicCount: 6,
    sourceCount: 18,
    status: "ready",
  },
  {
    id: "m-03",
    title: "Họp tuần sản phẩm",
    kind: "san-pham",
    startedAt: "2026-10-30T15:00:00",
    durationSec: 1875,
    topicCount: 3,
    sourceCount: 7,
    status: "ended",
  },
  {
    id: "m-04",
    title: "Lớp học phần AI tạo sinh: ôn chủ đề kiểm chứng",
    kind: "dao-tao",
    startedAt: "2026-10-30T10:30:00",
    durationSec: 3480,
    topicCount: 5,
    sourceCount: 14,
    status: "ready",
  },
  {
    id: "m-05",
    title: "Đàm phán đại lý miền Trung",
    kind: "ban-le",
    startedAt: "2026-10-29T14:00:00",
    durationSec: 2118,
    topicCount: 4,
    sourceCount: 9,
    status: "ended",
  },
  {
    id: "m-06",
    title: "Đánh giá prototype MeetMate",
    kind: "san-pham",
    startedAt: "2026-10-29T09:00:00",
    durationSec: 1620,
    topicCount: 7,
    sourceCount: 21,
    status: "ended",
  },
  {
    id: "m-07",
    title: "Nhóm nghiên cứu: bộ dữ liệu kiểm thử claim Việt–Anh",
    kind: "nghien-cuu",
    startedAt: "2026-10-28T11:00:00",
    durationSec: 2760,
    topicCount: 5,
    sourceCount: 16,
    status: "ended",
  },
  {
    id: "m-08",
    title: "Kênh phân phối B2B",
    kind: "san-pham",
    startedAt: "2026-10-28T09:20:00",
    durationSec: 598,
    topicCount: 2,
    sourceCount: 5,
    status: "ended",
  },
];

/* ------------------------------------------------------------------ */
/* Knowledge base (User Knowledge Base, mục III.1.2)                   */
/* ------------------------------------------------------------------ */

export interface DocItem {
  id: string;
  title: string;
  excerpt: string;
  addedAt: string;
}

// Chuỗi truy xuất là Meeting Context → User Knowledge Base → External Research,
// nên tài liệu ở đây là lớp giữa: thứ MeetMate đối chiếu trước khi ra ngoài tìm.
// Chưa đấu nối với luồng AI — thư mục extension chưa có dòng code nào — nên mọi
// surface dùng danh sách này phải tự nói rõ điều đó ngay trong nhãn.
export const initialDocs: DocItem[] = [
  {
    id: "doc-01",
    title: "Khảo sát nhu cầu 42 nhóm startup Đà Nẵng",
    excerpt:
      "Tần suất họp trung bình 6 phiên/tuần; 71% trả lời phải tra cứu lại thông tin sau họp. Câu hỏi mở nhiều nhất: nguồn của con số đưa ra trong họp.",
    addedAt: "2026-10-31T09:00:00",
  },
  {
    id: "doc-02",
    title: "Bảng giá dự kiến các gói MeetMateAI",
    excerpt:
      "Bốn bậc Free / Pro / Team / Edu, giới hạn theo số phiên họp có AI, lượt kiểm chứng và số artifact. Giá Pro thấp hơn Fireflies Pro khoảng 25%.",
    addedAt: "2026-10-28T13:40:00",
  },
  {
    id: "doc-03",
    title: "Bộ câu hỏi kiểm thử claim Việt–Anh",
    excerpt:
      "180 nhận định có chủ đích: số liệu thị trường, thông tin đối thủ, tuyên bố về khách hàng. Mỗi dòng ghi rõ trạng thái bằng chứng mong đợi.",
    addedAt: "2026-10-26T20:10:00",
  },
];

/* ------------------------------------------------------------------ */
/* Bản ghi cuộc họp                                                    */
/* ------------------------------------------------------------------ */

// Không có tên người nói: extension chỉ phân biệt hai kênh âm (tab Meet và
// micro của người dùng). Ghi "ai đó nói gì" sẽ bịa ra một thứ dữ liệu hệ thống
// không hề thu thập.
import transcriptFixture from "../mocks/meeting-transcript.json";

export const sampleLines: MeetingLine[] = transcriptFixture as MeetingLine[];

/* ------------------------------------------------------------------ */
/* Chủ đề + kết quả research (khớp mocks/meetmate-output.json)         */
/* ------------------------------------------------------------------ */

export const sampleTopics: { topic: Topic; result: ResearchResult; posted: number; cancelled: boolean }[] = [
  {
    topic: {
      topic: "Bảng giá gói SME Việt Nam",
      keywords: ["SME", "giá", "gói", "VND", "thị trường"],
      query: "bảng giá phần mềm cho SME Việt Nam 2026",
    },
    result: {
      topic: "Bảng giá gói SME Việt Nam",
      summary:
        "Thị trường SaaS Việt Nam dưới 20 nhân viên phổ biến ở khoảng 300.000–800.000 đồng mỗi tháng; các gói niêm yết công khai thường quy theo năm.",
      sources: [
        {
          title: "Bảng giá — Base.vn",
          url: "https://example.com/base/bang-gia",
          reason: "Niêm yết công khai theo người dùng/tháng và có bậc SME.",
        },
        {
          title: "Bảng giá — Misa amis",
          url: "https://example.com/misa/bang-gia",
          reason: "Gói khởi tạo cho doanh nghiệp nhỏ, ghi rõ số user và thời hạn.",
        },
        {
          title: "Gói SME — Bravo Online",
          url: "https://example.com/bravo/goi-sme",
          reason: "Đối thủ trực tiếp ở phân khúc kế toán cho SME, có bậc theo số user.",
        },
        {
          title: "Niêm giá SaaS nội địa 2026 — NIC (PDF)",
          url: "https://example.com/nic/saas-viet-nam-2026",
          reason: "Báo cáo tổng hợp mặt bằng giá, dùng để kiểm tra hai con số ở trên.",
        },
      ],
    },
    posted: 3,
    cancelled: true,
  },
  {
    topic: {
      topic: "Tỷ lệ chuyển đổi freemium",
      keywords: ["freemium", "chuyển đổi"],
      query: "freemium to paid conversion rate benchmark 2026",
    },
    result: {
      topic: "Tỷ lệ chuyển đổi freemium",
      summary:
        "Mặt bằng chuyển đổi freemium sang trả phí thường ở khoảng 2–5%, phụ thuộc vào độ sâu của bậc miễn phí.",
      sources: [
        {
          title: "Freemium conversion benchmarks 2026",
          url: "https://example.com/freemium-benchmarks",
          reason: "Tổng hợp 120 sản phẩm, tách riêng nhóm B2B SaaS.",
        },
      ],
    },
    posted: 2,
    cancelled: false,
  },
  {
    // Một chủ đề mà MeetMate tìm nhưng không đủ căn cứ. Đây là trạng thái thật
    // của pipeline — nguồn rỗng — và là lý do sản phẩm không thể chỉ hiện "đã xong".
    topic: {
      topic: "Kênh phân phối: đại lý hay bán trực tiếp",
      keywords: ["kênh phân phối", "đại lý", "B2B"],
      query: "kênh phân phối phần mềm B2B Việt Nam đại lý",
    },
    result: {
      topic: "Kênh phân phối: đại lý hay bán trực tiếp",
      summary:
        "Tìm 4 truy vấn, không có nguồn nào niêm yết tỉ lệ doanh thu qua đại lý cho SaaS Việt Nam. Chưa đủ căn cứ để kết luận.",
      sources: [],
    },
    posted: 1,
    cancelled: false,
  },
];

/* ------------------------------------------------------------------ */
/* Định dạng                                                           */
/* ------------------------------------------------------------------ */

/** "1 thg 11, 2026" — eyebrow của mọi nhóm. Không viết hoa: tiếng Việt không
 *  dùng caps cho nhãn, và `toUpperCase()` làm gãy một số dấu. */
export function formatGroupDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** "36 giây", "10 phút", "2 phút 15 giây", "1 giờ 4 phút". */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  if (s < 60) return `${s} giây`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 === 0 ? `${m} phút` : `${m} phút ${s % 60} giây`;
  return `${Math.floor(m / 60)} giờ ${m % 60} phút`;
}

/** mm:ss cho đồng hồ đang chạy — một đồng hồ duy nhất trên mọi surface. */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  return `${mm}:${String(s % 60).padStart(2, "0")}`;
}

export function meetingDurationSec(m: MeetingRecord): number {
  return m.durationSec;
}

/** 199.000đ — đúng cách viết trong bảng giá của bản mô tả. */
export function formatVnd(n: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
}

/* ------------------------------------------------------------------ */
/* Tùy chọn nghiên cứu (thay cho "Answer preferences")                 */
/* ------------------------------------------------------------------ */

export interface ResearchPrefs {
  /** số nguồn tối đa mỗi chủ đề, trần ở LIMITS.maxSources */
  sources: number;
  queryLanguage: "vi" | "en" | "auto";
  /** tự động gõ vào chat Meet, hay chờ người dùng bấm */
  autoPost: boolean;
  /** bỏ qua khi chủ đề rỗng (chuyện phiếm) */
  skipSmallTalk: boolean;
  saveTranscript: boolean;
  textSize: "S" | "M" | "L";
}

export const defaultPrefs: ResearchPrefs = {
  sources: 4,
  queryLanguage: "auto",
  autoPost: true,
  skipSmallTalk: true,
  saveTranscript: true,
  textSize: "M",
};

export const SOURCE_OPTIONS: { id: number; label: string; note: string }[] = [
  { id: 2, label: "2 nguồn", note: "Ngắn, gửi nhanh, đủ để mở thảo luận." },
  { id: 4, label: "4 nguồn", note: "Mặc định. Trùng trần kỹ thuật của pipeline." },
  { id: 6, label: "6 nguồn", note: "Sâu hơn, nhưng vượt trần 4 nguồn — cần nới LIMITS." },
];

export const QUERY_LANG_OPTIONS: { id: ResearchPrefs["queryLanguage"]; label: string; note: string }[] = [
  { id: "auto", label: "Tự động", note: "Giữ nguyên ngôn ngữ câu đang bàn." },
  { id: "vi", label: "Tiếng Việt", note: "Truy vấn tiếng Việt, ưu tiên nguồn trong nước." },
  { id: "en", label: "Tiếng Anh", note: "Truy vấn tiếng Anh cho tài liệu quốc tế." },
];

// Bản mô tả: "Toàn bộ chữ hiển thị cho người dùng viết bằng tiếng Việt", và
// điểm khác biệt là hội thoại Việt–Anh. Danh sách năm ngôn ngữ của đối thủ ở
// đây là một tuyên bố năng lực chưa có bằng chứng.
export const LANGUAGES = ["Tiếng Việt"] as const;

export const MODELS = [
  { name: "Blaze STT 1.5 realtime", note: "Bắt buộc — phiên âm tiếng Việt" },
  { name: "Blaze LLM", note: "Tách chủ đề, viết lý do chọn nguồn" },
  { name: "Exa", note: "Tìm nguồn; URL ngoài kết quả này bị loại" },
];

/* ------------------------------------------------------------------ */
/* Gói dịch vụ (bảng giá dự kiến, mục IV.3.1)                          */
/* ------------------------------------------------------------------ */

// Bảng giá trong tài liệu tự ghi: "Bảng giá là giả thuyết, sẽ được điều chỉnh
// sau khi đo chi phí thực tế". Trang upgrade vì vậy mang nhãn dự kiến ngay trên
// tiêu đề, không chờ người đọc đoán ra.
export interface Plan {
  id: "free" | "pro" | "team" | "edu";
  name: string;
  /** null = gói không niêm yết giá tháng */
  priceMonthly: number | null;
  priceYearly: number | null;
  priceQuarterly: number | null;
  /** "người/tháng", "quý"… — rỗng với giá cá nhân */
  unit: string;
  min: string | null;
  limits: string[];
  audience: string;
  current: boolean;
}

export const PLANS: readonly Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: null,
    priceQuarterly: null,
    unit: "",
    min: null,
    limits: ["3 phiên họp", "tối đa 45 phút/phiên", "10 lượt kiểm chứng", "1 artifact"],
    audience: "Cá nhân dùng thử, sinh viên",
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 199_000,
    priceYearly: 1_990_000,
    priceQuarterly: null,
    unit: "",
    min: null,
    limits: ["15 phiên họp", "60 lượt kiểm chứng", "10 artifact", "Knowledge base cá nhân"],
    audience: "Freelancer, tư vấn viên, trưởng nhóm",
    current: false,
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 179_000,
    priceYearly: null,
    priceQuarterly: null,
    unit: "người/tháng",
    min: "tối thiểu 3 người",
    limits: [
      "Hạn mức như Pro, nhân theo số người",
      "Dùng chung trong nhóm",
      "Knowledge base chung",
      "Lịch sử phiên họp của nhóm",
    ],
    audience: "Startup, agency, nhóm product/marketing",
    current: false,
  },
  {
    id: "edu",
    name: "Edu / Pilot B2B",
    priceMonthly: null,
    priceYearly: null,
    priceQuarterly: 4_500_000,
    unit: "quý",
    min: "tối đa 15 người",
    limits: ["Theo thỏa thuận", "Hỗ trợ triển khai", "Báo cáo hiệu quả sử dụng"],
    audience: "Khoa, trung tâm nghiên cứu, vườn ươm, doanh nghiệp pilot",
    current: false,
  },
];

/** Đơn vị tính phí — tài liệu nói rõ: phiên họp, lượt kiểm chứng, artifact; không phải phút. */
export const PLAN_MATRIX = {
  columns: [
    { id: "free", label: "Free", note: "Gói hiện tại" },
    { id: "pro", label: "Pro", note: "Cá nhân trả phí" },
    { id: "team", label: "Team", note: "Theo người" },
    { id: "edu", label: "Edu / Pilot", note: "Theo tổ chức" },
  ],
  rows: [
    { object: "Phiên họp có AI hỗ trợ", free: "3 / tháng", pro: "15 / tháng", team: "15 × số người", edu: "Theo thỏa thuận" },
    { object: "Độ dài mỗi phiên", free: "45 phút", pro: "Không ghi trong bảng", team: "Không ghi trong bảng", edu: "Không ghi trong bảng" },
    { object: "Lượt kiểm chứng / nghiên cứu", free: "10", pro: "60", team: "60 × số người", edu: "Theo thỏa thuận" },
    { object: "Artifact", free: "1", pro: "10", team: "10 × số người", edu: "Theo thỏa thuận" },
    { object: "Knowledge base", free: "—", pro: "Cá nhân", team: "Chung cho nhóm", edu: "Chung cho đơn vị" },
    { object: "Lịch sử phiên họp của nhóm", free: "—", pro: "—", team: "Có", edu: "Có" },
    { object: "Hỗ trợ triển khai + báo cáo hiệu quả", free: "—", pro: "—", team: "—", edu: "Có" },
  ],
} as const;

/** Ba điểm chạm nâng cấp, nguyên văn mục IV.3.2 — đặt ở trang giá vì đó là chỗ quyết định. */
export const UPGRADE_TOUCHPOINTS = [
  "Hết lượt kiểm chứng giữa một cuộc họp quan trọng.",
  "Muốn xuất artifact thành slide hoặc bảng tính hoàn chỉnh để gửi cho đối tác.",
  "Muốn chia sẻ knowledge base cho cả nhóm — điểm chạm mạnh nhất.",
] as const;

/* ------------------------------------------------------------------ */
/* Tài khoản                                                           */
/* ------------------------------------------------------------------ */

export const ACCOUNT = {
  name: "Nguyễn Quang Thông",
  email: "thong@meetmate.demo",
  initials: "NQ",
  role: "Full Stack Developer",
  team: "MeetMateAI · nhóm 4 người",
  joined: "Tham gia tháng 9/2026",
  plan: "Free",
  planNote: "Bạn đang ở gói Free. Hạn mức còn lại hiển thị ngay trên thẻ này.",
  renews: null,
  method: "Chưa có phương thức thanh toán",
} as const;

/* ------------------------------------------------------------------ */
/* Dữ liệu của bạn (mục III.2.8)                                       */
/* ------------------------------------------------------------------ */

// Ba chế độ này là thiết kế đã chốt, không phải công tắc tuỳ hứng. Riêng tư giữ
// toàn bộ xử lý trong Chrome nhưng mất Research/Verify — nói thiếu điều đó là
// bán một khả năng sản phẩm không có.
export const PRIVACY_MODES = [
  {
    id: "cloud",
    title: "Cloud (mặc định)",
    note: "Gửi âm thanh và bản ghi lên backend.",
    on: true,
  },
  {
    id: "hybrid",
    title: "Hybrid",
    note: "Chạy STT trên máy và xoá tên, số, tổ chức trước khi gửi truy vấn tìm nguồn.",
    on: false,
  },
  {
    id: "private",
    title: "Riêng tư",
    note: "Giữ toàn bộ xử lý trong Chrome. Giới hạn ở transcript local và kiểm chứng bằng luật trên tài liệu của chính bạn — không có Research và Verify, vì tìm nguồn trên web bắt buộc gửi truy vấn ra ngoài.",
    on: false,
  },
] as const;

export const DATA_ROWS = [
  {
    id: "retention",
    title: "Giữ bản ghi cuộc họp",
    note: "Bản ghi và kết quả research của mỗi phiên nằm trong vùng làm việc này cho tới khi bạn xoá.",
    on: true,
  },
  {
    id: "train",
    title: "Dùng dữ liệu của tôi để cải thiện bộ kiểm thử claim",
    note: "Mặc định tắt. Tài liệu của bạn không dùng để trả lời cho người khác.",
    on: false,
  },
] as const;

/** Trần hiển thị ở chân mọi thẻ kết quả — nói đúng những gì hệ thống đảm bảo. */
export const RESEARCH_FOOTNOTE = `Mọi đường dẫn đều nằm trong kết quả tìm nguồn · Tin gửi vào chat dài tối đa ${LIMITS.chatMaxChars} ký tự, cách nhau ${LIMITS.chatGapMs} ms`;
