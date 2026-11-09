// Google Meet's chat, in English and Vietnamese UI. Meet changes its DOM, so each target is a
// list tried in order; aria-label survives most redesigns better than class names.
// Seen live (11/2026, Vietnamese UI): the box and its button are labelled "Gửi thư", the panel
// is titled "Tin nhắn trong cuộc gọi".
export const CHAT_INPUT = [
  'textarea[aria-label="Gửi thư"]',
  'textarea[aria-label="Send a message"]',
  'textarea[aria-label*="Gửi thư" i]',
  'textarea[aria-label*="message" i]',
  'textarea[aria-label*="tin nhắn" i]',
  'textarea[placeholder*="Gửi" i]',
  'textarea[placeholder*="message" i]',
  '[contenteditable="true"][aria-label*="message" i]',
  '[contenteditable="true"][aria-label*="Gửi thư" i]',
  // The chat box is the only textarea Meet shows during a call.
  'textarea',
];
export const CHAT_SEND_BUTTON = [
  'button[aria-label="Gửi thư"]',
  'button[aria-label="Send a message"]',
  'button[aria-label*="Gửi thư" i]',
  'button[aria-label*="Send" i]',
  'button[aria-label*="Gửi" i]',
];
export const CHAT_OPEN_BUTTON = [
  'button[aria-label*="Chat with everyone" i]',
  'button[aria-label*="Trò chuyện với mọi người" i]',
  'button[aria-label*="Tin nhắn trong cuộc gọi" i]',
  'button[aria-label*="chat" i]',
  'button[aria-label*="Trò chuyện" i]',
  'button[aria-label*="tin nhắn" i]',
];
