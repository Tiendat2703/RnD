// Google Meet's chat, in English and Vietnamese UI. Meet changes its DOM, so each target is a
// list tried in order; aria-label survives most redesigns better than class names.
export const CHAT_INPUT = [
  'textarea[aria-label="Send a message"]',
  'textarea[aria-label="Gửi tin nhắn"]',
  'textarea[aria-label*="message" i]',
  'textarea[aria-label*="tin nhắn" i]',
  '[contenteditable="true"][aria-label*="message" i]',
  '[contenteditable="true"][aria-label*="tin nhắn" i]',
];
export const CHAT_SEND_BUTTON = [
  'button[aria-label="Send a message"]',
  'button[aria-label="Gửi tin nhắn"]',
  'button[aria-label*="Send" i]',
  'button[aria-label*="Gửi" i]',
];
export const CHAT_OPEN_BUTTON = [
  'button[aria-label*="Chat with everyone" i]',
  'button[aria-label*="Trò chuyện với mọi người" i]',
  'button[aria-label*="chat" i]',
  'button[aria-label*="Trò chuyện" i]',
];
