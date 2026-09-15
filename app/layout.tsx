import type { Metadata } from "next";
import "./globals.css";
import "./community.css";
import CommentDraftSuccessGuard from "./comment-draft-success-guard";

export const metadata: Metadata = {
  title: "LINEレンジャー 新キャラ情報掲示板＋PvPランキング｜Owner確認版",
  description: "新キャラ情報掲示板にレジェンド帯PvPランキングを統合したOwner確認版。",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  icons: {icon: "/favicon.svg"},
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode;}>) {
  return <html lang="ja" className="dark"><body className="antialiased"><CommentDraftSuccessGuard />{children}</body></html>;
}
