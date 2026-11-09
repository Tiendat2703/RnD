// Selector chat Google Meet, thử lần lượt. CHƯA kiểm chứng trên cuộc họp thật
// (Task 1 bước 3 cần người mở Meet): ưu tiên thuộc tính không đổi theo ngôn ngữ.
export const CHAT_INPUT = [
  'textarea[name="chatTextInput"]',
  'textarea[jsname="YPqjbf"]',
  'div[role="complementary"] textarea',
  'textarea',
];

export const CHAT_SEND_BUTTON = [
  'button[jsname="SoqoBf"]',
  'button[aria-label*="Send a message"]',
  'button[aria-label*="Gửi"]',
];

export const CHAT_OPEN_BUTTON = [
  'button[aria-label*="Chat with everyone"]',
  'button[aria-label*="Trò chuyện với mọi người"]',
  'button[jsname="A5il2e"]',
];

// Nút kết thúc cuộc gọi (chưa kiểm chứng trên Meet thật): thử theo nhãn và jsname.
export const LEAVE_BUTTON = [
  'button[aria-label*="Leave call"]',
  'button[aria-label*="Rời khỏi cuộc gọi"]',
  'button[aria-label*="Rời khỏi cuộc họp"]',
  'button[jsname="CQylAd"]',
];
