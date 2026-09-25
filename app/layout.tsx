import "./globals.css";

export const metadata = {
  title: "Product weekly — Sidekick",
  description: "A frontend-only AI meeting sidekick demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
