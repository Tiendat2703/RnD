// Builds the MeetMate Chrome extension into dist-extension/ (load it with "Load unpacked").
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';

const out = 'dist-extension';
// Empty the folder rather than removing it: a server or window open inside it makes rmdir fail with EBUSY.
await mkdir(out, { recursive: true });
for (const name of await readdir(out)) await rm(`${out}/${name}`, { recursive: true, force: true });

const common = {
  bundle: true,
  platform: 'browser',
  target: 'chrome116',
  sourcemap: true,
  logLevel: 'warning',
  // the in-Meet panel imports theme.css as a string and injects it into its shadow root
  loader: { '.css': 'text' },
  // ExaProvider reads process.env only when no key is passed; the extension always passes one.
  define: { 'process.env.EXA_API_KEY': 'undefined', 'process.env.NODE_ENV': '"production"' },
};

await Promise.all([
  build({
    ...common,
    format: 'iife',
    entryPoints: {
      background: 'extension/src/background.ts',
      offscreen: 'extension/src/offscreen.ts',
      content: 'extension/src/content/content.ts',
      bridge: 'extension/src/bridge.ts',
      'mic-permission': 'extension/src/mic-permission.ts',
      'pcm-worklet': 'extension/src/pcm-worklet.ts',
    },
    outdir: out,
  }),
  // pdf.js ships as an ES module, so the side panel loads as <script type="module">.
  build({ ...common, format: 'esm', entryPoints: { sidepanel: 'extension/src/sidepanel.ts' }, outdir: out }),
]);

await cp('extension/static', out, { recursive: true });
const pdfjs = 'node_modules/pdfjs-dist';
await cp(`${pdfjs}/build/pdf.worker.min.mjs`, `${out}/pdf.worker.min.mjs`);
await cp(`${pdfjs}/cmaps`, `${out}/cmaps`, { recursive: true });
await cp(`${pdfjs}/standard_fonts`, `${out}/standard_fonts`, { recursive: true });
console.log(`Built ${out}/ — chrome://extensions → Developer mode → Load unpacked → chọn thư mục này.`);
