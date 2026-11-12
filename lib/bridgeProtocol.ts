// lib/bridgeProtocol.ts — giao thức giữa web console và extension MeetMate.
//
// Web không có kênh nào khác để nói chuyện với extension: một content script
// (`agents/sidekick/extension/src/bridge.ts`) chạy trong trang web console, nhận
// `window.postMessage` rồi chuyển cho background. Hai bên import CÙNG file này,
// nên một thay đổi kiểu sẽ làm cả hai phía lỗi biên dịch cùng lúc.
//
// Không có khóa API nào đi qua đây. `keysSet` chỉ là boolean.
import type { SessionDocument } from "./documents";
import type { KnowledgeCard } from "./evidence";
import type { LineSource, MeetingKind, PipelineStage, ResearchResult, Topic } from "./types";

/** Giá trị trường `source` của envelope, để lọc message không phải của MeetMate. */
export const BRIDGE_WEB = "meetmate-web";
export const BRIDGE_EXT = "meetmate-ext";

/** Phiên do web tạo, gửi sang extension trước khi người dùng bấm Bắt đầu. */
export interface SessionDraft {
  id: string;
  title: string;
  kind: MeetingKind;
  /** số nguồn tối đa mỗi chủ đề */
  sources: number;
  autoPost: boolean;
  /**
   * tài liệu đối chiếu đã chọn cho phiên (nội dung đã chia đoạn, lấy từ backend). Extension
   * thay kho tài liệu của nó bằng đúng danh sách này; thiếu = phiên không có tài liệu.
   */
  documents?: SessionDocument[];
}

export type WebToExt =
  | { type: "ping" }
  | { type: "session.prepare"; session: SessionDraft }
  | { type: "session.stop" }
  /** xin toàn bộ phiên extension đã lưu (kể cả phiên diễn ra khi web không mở) */
  | { type: "sessions.list" }
  /** xóa một phiên đã lưu (khi người dùng xóa cuộc họp trên web) */
  | { type: "sessions.delete"; id: string }
  /** backend đã lưu phiên và báo cáo: extension đánh dấu để được phép dọn phiên này */
  | { type: "sessions.markSynced"; id: string; syncedAt: number };

export interface ExtInfo {
  version: string;
  /** đã nhập khóa Blaze trong khung bên extension (không gửi giá trị); Exa không bắt buộc */
  keysSet: boolean;
  /** chế độ thử cũ của extension; bản hiện tại luôn trả false */
  mock?: boolean;
  /** số tab Google Meet đang ở trong một cuộc họp */
  meetTabs: number;
  running: boolean;
  status: string;
  sessionId: string | null;
}

export interface BridgeLine {
  id: string;
  text: string;
  /** ms kể từ lúc extension bắt đầu nghe */
  atMs: number;
  source: LineSource;
}

/** Một chủ đề đã tách trong phiên, kèm kết quả tìm nguồn (nếu đã xong). */
export interface SavedTopic {
  topic: Topic;
  result: ResearchResult | null;
  /** số tin đã thật sự vào chat Meet cho chủ đề này (0 ở chế độ thử) */
  posted: number;
}

/** Phiên do extension lưu trong chrome.storage.local — nguồn sự thật của web. */
export interface SavedSession {
  id: string;
  title: string;
  kind: MeetingKind;
  /** epoch ms */
  startedAt: number;
  /** null = phiên còn đang chạy */
  endedAt: number | null;
  lines: BridgeLine[];
  topics: SavedTopic[];
  /** thẻ đối chiếu (Knowledge Card); phiên lưu trước khi có thẻ thì thiếu trường này */
  cards?: KnowledgeCard[];
  /**
   * epoch ms lúc backend xác nhận đã lưu phiên (bấm "Lưu phiên" trên web).
   * Thiếu hoặc null = chưa gửi: extension không được dọn phiên này.
   */
  syncedAt?: number | null;
}

export type ExtToWeb =
  | { type: "sessions"; sessions: SavedSession[] }
  | { type: "pong"; info: ExtInfo }
  /** `running` = chạy khỏe; `active` = phiên còn mở dù đang chạy kém (vd. không có micro) */
  | { type: "status"; status: string; running: boolean; active?: boolean; mock?: boolean; sessionId: string | null }
  | { type: "line"; line: BridgeLine }
  | { type: "topic"; topic: Topic }
  | { type: "stage"; stage: PipelineStage | null }
  | { type: "research"; result: ResearchResult }
  /** một thẻ đối chiếu: nhận định kèm trạng thái bằng chứng và trích dẫn tài liệu */
  | { type: "card"; card: KnowledgeCard }
  /** một tin đã thật sự vào chat Meet */
  | { type: "posted"; text: string }
  | { type: "error"; message: string }
  | { type: "ended"; reason: "stopped" | "meet-closed" | "left" | "error" };

export interface Envelope<T> {
  source: typeof BRIDGE_WEB | typeof BRIDGE_EXT;
  payload: T;
}

/** Trạng thái chuỗi mà background gửi; web so sánh với đúng các giá trị này. */
export const STATUS_RUNNING = "Đang chạy";
export const STATUS_STARTING = "Đang khởi động…";
export const STATUS_WAITING = "Đã nhận phiên — mở tab Meet rồi bấm biểu tượng MeetMate để bắt đầu";
