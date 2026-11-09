// Biểu tượng nét 1.8px, đầu tròn, vẽ inline (hợp đồng thiết kế). Chuỗi SVG tĩnh,
// không chứa dữ liệu người dùng, nên dựng bằng DOMParser là an toàn.
const PATHS = {
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
  warn: '<path d="M12 4 3.5 19h17z"/><path d="M12 10v4M12 16.6v.1"/>',
  error: '<path d="M8.5 3.5h7l5 5v7l-5 5h-7l-5-5v-7z"/><path d="M12 8v5M12 15.8v.1"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.1"/>',
  mic: '<rect x="9" y="3.5" width="6" height="10.5" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
  'ev-supported': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  'ev-partial': '<circle cx="12" cy="12" r="7.5"/><path d="M12 4.5a7.5 7.5 0 0 1 0 15z" fill="currentColor"/>',
  'ev-contradicted': '<path d="M7 7l10 10M17 7 7 17"/>',
  'ev-insufficient': '<path d="M9.2 9.5a2.9 2.9 0 1 1 4.3 2.5c-.9.5-1.5 1.1-1.5 2.2"/><path d="M12 17.6v.1"/>',
  minus: '<path d="M6 12h12"/>',
  expand: '<path d="M6 9l6 6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function icon(name: IconName): SVGElement {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">${PATHS[name]}</svg>`,
    'image/svg+xml',
  );
  return document.importNode(doc.documentElement, true) as unknown as SVGElement;
}
