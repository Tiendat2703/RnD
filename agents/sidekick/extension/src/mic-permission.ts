// The offscreen page cannot show a permission prompt, so this visible page asks once; the grant
// then holds for every page of the extension.
const statusLine = document.getElementById('status')!;
const button = document.getElementById('allow') as HTMLButtonElement;

async function ask(): Promise<void> {
  button.disabled = true;
  statusLine.textContent = 'Chrome đang hỏi quyền dùng micro…';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop();
    statusLine.textContent = 'Đã cấp quyền micro. Quay lại tab Meet và bấm Bắt đầu trong MeetMate.';
    document.body.dataset.state = 'ok';
    setTimeout(() => window.close(), 2_500);
  } catch {
    statusLine.textContent = 'Chưa có quyền micro. MeetMate vẫn nghe được người khác, nhưng không nghe được giọng của bạn. Bấm biểu tượng ổ khóa trên thanh địa chỉ để cho phép rồi thử lại.';
    document.body.dataset.state = 'denied';
    button.disabled = false;
  }
}

button.addEventListener('click', () => void ask());
void ask();

export {};
