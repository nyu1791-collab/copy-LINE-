import type { Metadata } from "next";
import "./globals.css";
import "./community.css";
import "./pvp-ranking.css";
import CommentDraftSuccessGuard from "./comment-draft-success-guard";

export const metadata: Metadata = {
  title: "LINEレンジャー レジェンド帯キャラ集計＋新キャラ情報掲示板",
  description: "レジェンド帯PvPキャラクター集計と新キャラ情報掲示板のOwner確認版。",
  robots: { index: false, follow: false },
  icons: {icon: "/favicon.svg"},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body className="antialiased"><CommentDraftSuccessGuard />{children}</body>
    </html>
  );
}
