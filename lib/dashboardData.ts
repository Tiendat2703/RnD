// lib/dashboardData.ts — dữ liệu mô phỏng cho MeetMateAI web console.
//
// Mọi con số ở đây lấy từ hai nguồn, không nguồn nào là của đối thủ:
// - Hạn mức và giá: bản mô tả RTS2026, mục IV.3.1 (bảng giá dự kiến).
// - Giới hạn kỹ thuật: `docs/plans/2026-11-01-meetmate-extension.md`, và `lib/types.ts`
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

// Các gói không giới hạn số phiên, thời lượng, kiểm chứng hoặc tải báo cáo.

/* ------------------------------------------------------------------ */
/* Cuộc họp                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Knowledge base (User Knowledge Base, mục III.1.2)                   */
/* ------------------------------------------------------------------ */

export interface DocItem {
  id: string;
  title: string;
  excerpt: string;
  addedAt: string;
  /** thông tin lập chỉ mục — chỉ có ở tài liệu kho mẫu */
  format?: string;
  pages?: number;
  chunks?: number;
  scope?: "Nhóm" | "Cá nhân";
  owner?: string;
}

// Chuỗi truy xuất là Meeting Context → User Knowledge Base → External Research,
// nên tài liệu ở đây là lớp giữa: thứ MeetMate đối chiếu trước khi ra ngoài tìm.
// Chưa đấu nối với luồng AI — thư mục extension chưa có dòng code nào — nên mọi
// surface dùng danh sách này phải tự nói rõ điều đó ngay trong nhãn.
/** Kho tài liệu bắt đầu rỗng: chưa có pipeline tài liệu thật. */
export const initialDocs: DocItem[] = [];

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
  /** tên gói thấp hơn mà gói này gồm toàn bộ (hiện thành "Gồm mọi thứ trong …") */
  inherits?: string;
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
    limits: ["Phiên họp không giới hạn", "Thời lượng không giới hạn", "Kiểm chứng không giới hạn", "Tải PDF không giới hạn"],
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
    limits: ["Phiên họp không giới hạn", "Thời lượng không giới hạn", "Kiểm chứng không giới hạn", "Tải PDF không giới hạn, kèm biểu đồ PNG", "Knowledge base cá nhân"],
    audience: "Freelancer, tư vấn viên, trưởng nhóm",
    current: false,
    inherits: "Free",
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 179_000,
    priceYearly: null,
    priceQuarterly: null,
    unit: "người/tháng",
    min: "không giới hạn người dùng",
    limits: [
      "Phiên họp, thời lượng và kiểm chứng không giới hạn",
      "Dùng chung trong nhóm",
      "Knowledge base chung; phân quyền và quản trị hoàn thiện ở giai đoạn Validation",
      "Danh sách phiên của nhóm: mã phiên, ngày, thời lượng, số nhận định",
    ],
    audience: "Startup, agency, nhóm product/marketing",
    current: false,
    inherits: "Pro",
  },
  {
    id: "edu",
    name: "Edu / Pilot B2B",
    priceMonthly: null,
    priceYearly: null,
    priceQuarterly: 4_500_000,
    unit: "quý",
    min: "không giới hạn người dùng",
    limits: ["Phiên họp, thời lượng, kiểm chứng và tải PDF không giới hạn", "Hỗ trợ triển khai", "Báo cáo hiệu quả sử dụng"],
    audience: "Khoa, trung tâm nghiên cứu, vườn ươm, doanh nghiệp pilot",
    current: false,
    inherits: "Team",
  },
];

/** So sánh hạn mức phiên họp, kiểm chứng và chức năng của các gói. */
export const PLAN_MATRIX = {
  columns: [
    { id: "free", label: "Free", note: "Gói hiện tại" },
    { id: "pro", label: "Pro", note: "Cá nhân trả phí" },
    { id: "team", label: "Team", note: "Theo người" },
    { id: "edu", label: "Edu / Pilot", note: "Theo tổ chức" },
  ],
  rows: [
    { object: "Phiên họp có AI hỗ trợ", free: "Không giới hạn", pro: "Không giới hạn", team: "Không giới hạn", edu: "Không giới hạn" },
    { object: "Độ dài mỗi phiên", free: "Không giới hạn", pro: "Không giới hạn", team: "Không giới hạn", edu: "Không giới hạn" },
    { object: "Lượt kiểm chứng", free: "Không giới hạn", pro: "Không giới hạn", team: "Không giới hạn", edu: "Không giới hạn" },
    { object: "Tải báo cáo PDF", free: "Không giới hạn", pro: "Không giới hạn", team: "Không giới hạn", edu: "Không giới hạn" },
    { object: "Knowledge base", free: "—", pro: "Cá nhân", team: "Chung cho nhóm", edu: "Chung cho đơn vị" },
    { object: "Lịch sử phiên họp của nhóm", free: "—", pro: "—", team: "Có", edu: "Có" },
    { object: "Hỗ trợ triển khai + báo cáo hiệu quả", free: "—", pro: "—", team: "—", edu: "Có" },
  ],
} as const;

/** Bảng so sánh chia nhóm để đọc từng phần; hàng lấy từ PLAN_MATRIX theo tên. */
export const PLAN_MATRIX_GROUPS: { id: string; label: string; rows: string[] }[] = [
  {
    id: "dung",
    label: "Phiên họp và kiểm chứng",
    rows: ["Phiên họp có AI hỗ trợ", "Độ dài mỗi phiên", "Lượt kiểm chứng", "Tải báo cáo PDF"],
  },
  {
    id: "nhom",
    label: "Tài liệu và nhóm",
    rows: ["Knowledge base", "Lịch sử phiên họp của nhóm", "Hỗ trợ triển khai + báo cáo hiệu quả"],
  },
];

/** Giải thích đơn vị đếm, hiện khi rê chuột vào tên hàng trong bảng so sánh. */
export const PLAN_TERMS: Record<string, string> = {
  "Phiên họp có AI hỗ trợ": "Mỗi cuộc họp có MeetMate chạy là một phiên.",
  "Lượt kiểm chứng":
    "Một lần MeetMate đối chiếu một nhận định hoặc trả lời một câu hỏi trong họp bằng tài liệu nội bộ bạn đã tải lên.",
  "Tải báo cáo PDF": "Tải báo cáo cuộc họp dưới dạng PDF không giới hạn số lần ở mọi gói.",
  "Knowledge base": "Tài liệu nhóm tải lên để MeetMate đối chiếu trong cuộc họp.",
};

/** Câu hỏi thường gặp. Mỗi câu trả lời chỉ nói điều bản mô tả RTS2026 nói; chỗ tài liệu chưa chốt thì ghi là chưa chốt. */
export const UPGRADE_FAQ: { q: string; a: string }[] = [
  {
    q: "Một phiên họp có AI hỗ trợ được tính thế nào?",
    a: "Một cuộc họp do host xử lý một lần là một phiên, không nhân theo số người tham dự. Số phiên và thời lượng mỗi phiên không giới hạn ở mọi gói.",
  },
  {
    q: "Một lượt kiểm chứng là gì?",
    a: "Một lần MeetMate đối chiếu một nhận định hoặc trả lời một câu hỏi trong họp bằng tài liệu nội bộ bạn đã tải lên, rồi hiện kết quả ở một thẻ có trạng thái bằng chứng và trích dẫn. Trong MVP, MeetMate chưa tìm nguồn trên web.",
  },
  {
    q: "Tải báo cáo PDF có giới hạn không?",
    a: "Không. Bạn có thể tải lại báo cáo PDF không giới hạn số lần ở mọi gói.",
  },
  {
    q: "Khi nào bắt đầu thu phí?",
    a: "Chức năng thanh toán đã được phát triển nhưng chỉ cung cấp để trải nghiệm, chưa có giao dịch trả phí nào. Thu phí chính thức bắt đầu ở giai đoạn Paid beta, sau pilot tháng 1/2027. Giá, hạn mức và điều kiện phải hiện trước khi bạn xác nhận mua.",
  },
  {
    q: "Các gói có giới hạn sử dụng không?",
    a: "Không. Số phiên họp, thời lượng, lượt kiểm chứng và tải báo cáo đều không giới hạn.",
  },
  {
    q: "Dữ liệu cuộc họp được lưu bao lâu?",
    a: "Theo thiết kế: nội dung phiên (transcript, nhận định, trạng thái bằng chứng, quyết định, giả định) được xóa tối đa 24 giờ sau phiên, kể cả dữ liệu tạm cục bộ. Hãy tải báo cáo về trước thời hạn đó; bản tải về do bạn quản lý. Cơ chế xóa này cần được kiểm thử trước pilot và bản mẫu chưa triển khai.",
  },
  {
    q: "Gói Edu / Pilot B2B dành cho ai?",
    a: "Khoa, trung tâm nghiên cứu, vườn ươm và doanh nghiệp pilot: từ 4.500.000đ mỗi quý không giới hạn người dùng. Phiên họp, thời lượng, kiểm chứng và tải PDF không giới hạn, kèm hỗ trợ triển khai và báo cáo hiệu quả sử dụng.",
  },
];

/** Hai điểm chạm nâng cấp, theo mục IV.3.2 bản 2 — đặt ở trang giá vì đó là chỗ quyết định. */
export const UPGRADE_TOUCHPOINTS = [
  "Kiểm chứng không giới hạn trong suốt cuộc họp.",
  "Nhu cầu chia sẻ knowledge base cho cả nhóm — dự kiến, sẽ được kiểm chứng ở giai đoạn Validation trước khi thu phí.",
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
  planNote: "Bạn đang ở gói Free, sử dụng không giới hạn.",
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
    note: "Che tên, số, tổ chức trước khi gửi transcript tới mô hình ngôn ngữ. Audio vẫn gửi lên Blaze Voice trên cloud, nên đây không phải dữ liệu ở lại máy.",
    on: false,
  },
  {
    id: "private",
    title: "Riêng tư",
    note: "Xử lý hoàn toàn trong Chrome là định hướng sau MVP, chưa phải năng lực đã xác nhận; cần đánh giá chất lượng tiếng Việt, cấu hình máy và giới hạn chức năng. Prototype hiện có Cloud và Hybrid.",
    on: false,
  },
] as const;

export const DATA_ROWS = [
  {
    id: "retention",
    title: "Giữ bản ghi cuộc họp",
    note: "Theo thiết kế, nội dung phiên được xóa tối đa 24 giờ sau phiên; hãy tải báo cáo trước đó. Bản mẫu này chưa tự xóa.",
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
