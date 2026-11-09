import type { ExtToWeb, SessionDraft, WebToExt } from '../../../../lib/bridgeProtocol';

export type { ExtToWeb, SessionDraft, WebToExt };

export type Msg =
  | { type: 'meetmate.start'; tabId: number; streamId: string } // popup → background
  | { type: 'meetmate.stop' } // popup → background
  | {
      type: 'meetmate.offscreen.start';
      streamId: string;
      blazeApiKey: string;
      exaApiKey: string;
      /** tùy chọn của phiên do web console gửi; thiếu thì dùng mặc định */
      prefs: { sources: number; autoPost: boolean };
      /** chế độ thử: phát dữ liệu giả, không dùng khóa, không ghi âm */
      mock: boolean;
    } // background → offscreen
  | { type: 'meetmate.offscreen.stop' } // background → offscreen
  | { type: 'meetmate.post'; text: string } // offscreen → background → content
  | { type: 'meetmate.status'; status: string } // offscreen → background
  | { type: 'meetmate.event'; event: ExtToWeb } // offscreen → background → web
  | { type: 'meetmate.web'; msg: WebToExt } // bridge (trang web) → background
  | { type: 'meetmate.toweb'; event: ExtToWeb } // background → bridge
  | { type: 'meetmate.panel'; event: ExtToWeb } // background → content script trong tab Meet
  | { type: 'meetmate.left' }; // content script → background: người dùng rời cuộc họp

export const STATUS_KEY = 'status';
export const TAB_KEY = 'meetTabId';
export const WEB_TAB_KEY = 'webTabId';
export const SESSION_KEY = 'session';
export const MOCK_KEY = 'mockMode';
export const STAGE_KEY = 'stage';
/** phiên đang mở (true từ "Đang chạy" đến khi dừng), độc lập với dòng chữ trạng thái */
export const RUN_KEY = 'active';
/** origin của web console đã bắt tay với extension (vd. http://localhost:3000) */
export const WEB_ORIGIN_KEY = 'webOrigin';
