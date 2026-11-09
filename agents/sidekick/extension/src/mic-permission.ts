// Xin quyền micro một lần cho extension, rồi tự đóng.
import { installFonts } from './ui/fonts';
import { icon } from './ui/icons';
import theme from './ui/theme.css';

const style = document.createElement('style');
style.textContent = theme;
document.head.append(style);
installFonts();

const result = document.getElementById('result');

navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    stream.getTracks().forEach((t) => t.stop());
    window.close();
  })
  .catch(() => {
    // vẫn chạy được, chỉ kém: MeetMate nghe được âm thanh tab Meet mà không có micro
    if (!result) return;
    const band = document.createElement('div');
    band.className = 'band band--warn';
    band.append(
      icon('warn'),
      document.createTextNode(
        'Chưa có quyền micro. MeetMate vẫn nghe được âm thanh của người khác trong cuộc họp, nhưng không nghe được giọng bạn.',
      ),
    );
    result.replaceChildren(band);
  });
