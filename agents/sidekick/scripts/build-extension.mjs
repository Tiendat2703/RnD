import { build } from 'esbuild';
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

// Xoá nội dung chứ không xoá thư mục: một server/cửa sổ đang mở trong đó sẽ làm rmdir báo EBUSY.
mkdirSync('dist-extension', { recursive: true });
for (const name of readdirSync('dist-extension')) {
  rmSync(`dist-extension/${name}`, { recursive: true, force: true });
}

await build({
  entryPoints: {
    background: 'extension/src/background.ts',
    offscreen: 'extension/src/offscreen.ts',
    popup: 'extension/src/popup.ts',
    bridge: 'extension/src/bridge.ts',
    content: 'extension/src/content/content.ts',
    'mic-permission': 'extension/src/mic-permission.ts',
    'pcm-worklet': 'extension/src/pcm-worklet.ts',
  },
  outdir: 'dist-extension',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  // theme.css được nhập như chuỗi: popup và panel tự chèn, nên chỉ có một nguồn token
  loader: { '.css': 'text' },
  target: 'chrome116',
  // ExaProvider đọc process.env làm mặc định; khóa luôn được truyền tường minh.
  define: { 'process.env.EXA_API_KEY': '""' },
});

cpSync('extension/static', 'dist-extension', { recursive: true });
console.log('Built dist-extension/');
