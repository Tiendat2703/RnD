import type { Metadata } from "next";
import { Be_Vietnam_Pro, Overpass, Overpass_Mono } from "next/font/google";
import "./globals.css";

// Three faces, each with a job and a reason. They live in the ROOT layout
// because both chromes need them: the console at /dashboard and the live
// surface at / draw different rules but read the same words, and a font
// declared inside app/dashboard/layout.tsx is invisible to "/" — / would fall
// back to the system stack and lose the diacritic cut it exists for.
//
// The variable class goes on <html>, not <body>. globals.css declares
// `--font-ui: var(--font-bv), …` on `:root`, and a custom property is resolved
// where it is *declared*: with `--font-bv` living on <body>, `:root` cannot see
// it, `--font-ui` computes to the guaranteed-invalid value, `body{font-family:
// var(--font-ui)}` becomes invalid-at-computed-value-time, and every element
// that merely inherits — the whole transcript on "/" — silently renders in the
// UA serif. The fonts still load (document.fonts is full), so nothing looks
// broken in the network panel: only the computed family tells you.
//
// Every subset list includes "vietnamese". Be Vietnam Pro is chosen for its
// accented glyphs, Overpass for 11px legibility and an 800 wordmark, Overpass
// Mono for ASCII data (timings, URLs, counters). The handwriting face an early
// capture used is gone on purpose: the bundled Google registry gives it no
// vietnamese subset, so every accented word it set lost its marks.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bv",
  display: "swap",
});

const overpass = Overpass({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["600", "700", "800"],
  variable: "--font-op",
  display: "swap",
});

const overpassMono = Overpass_Mono({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500"],
  variable: "--font-opm",
  display: "swap",
});

const fontClassName = [
  beVietnamPro.variable,
  overpass.variable,
  overpassMono.variable,
].join(" ");

export const metadata: Metadata = {
  title: {
    default: "MeetMateAI — trợ lý nghiên cứu cho cuộc họp",
    template: "%s · MeetMateAI",
  },
  description:
    "MeetMateAI nghe cuộc họp bằng tiếng Việt, tách chủ đề cần kiểm chứng, tìm nguồn và gửi kết quả vào chat Meet — kèm lý do chọn từng nguồn.",
  applicationName: "MeetMateAI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={fontClassName} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
