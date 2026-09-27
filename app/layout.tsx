import "./globals.css";

export const metadata = {
  title: "Cuộc gọi LiveKit — Sidekick",
  description: "Phòng họp âm thanh trực tiếp qua LiveKit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
