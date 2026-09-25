import "./globals.css";

export const metadata = {
  title: "AI Meeting Sidekick",
  description: "Frontend-only MVP demo — see CLAUDE.md",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
