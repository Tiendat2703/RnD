// Ba họ phông của hợp đồng thiết kế, đóng gói trong extension (không gọi Google
// Fonts: extension không có network call nào ngoài Blaze/Exa). Tên họ có tiền tố
// "MM" để không bao giờ đè phông của trang Meet.
//
// Mono chỉ mang ASCII (00:14, [2/4], URL). Overpass và Mono là phông biến thiên, nên
// một file phủ cả dải độ đậm.
const FACES: { family: string; weight: string; file: string; range: string }[] = [
  { family: 'MM Be Vietnam Pro', weight: '400', file: 'bvp-400-latin.woff2', range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
  { family: 'MM Be Vietnam Pro', weight: '400', file: 'bvp-400-vi.woff2', range: 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB' },
  { family: 'MM Be Vietnam Pro', weight: '500 600', file: 'bvp-600-latin.woff2', range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
  { family: 'MM Be Vietnam Pro', weight: '500 600', file: 'bvp-600-vi.woff2', range: 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB' },
  { family: 'MM Overpass', weight: '600 800', file: 'overpass-latin.woff2', range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
  { family: 'MM Overpass', weight: '600 800', file: 'overpass-vi.woff2', range: 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB' },
  { family: 'MM Overpass Mono', weight: '400 500', file: 'overpass-mono-latin.woff2', range: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' },
];

/** CSS @font-face; `base` là thư mục fonts/ của extension (chrome.runtime.getURL('fonts/')). */
export function fontFaceCss(base: string): string {
  return FACES.map(
    (f) =>
      `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:swap;src:url('${base}${f.file}') format('woff2');unicode-range:${f.range};}`,
  ).join('\n');
}

/** Nạp phông vào tài liệu hiện tại (popup, trang quyền micro, hoặc trang Meet cho panel). */
export function installFonts(): void {
  if (document.getElementById('meetmate-fonts')) return;
  const style = document.createElement('style');
  style.id = 'meetmate-fonts';
  style.textContent = fontFaceCss(chrome.runtime.getURL('fonts/'));
  document.head.append(style);
}
