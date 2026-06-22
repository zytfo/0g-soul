import type { Metadata } from "next";
import { VT323, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://0g-soul.vercel.app"),
  title: "Soul",
  description:
    "Create an AI companion whose memory lives on 0G Storage and whom you mint as an NFT on the 0G chain.",
  icons: { icon: "/icon.png", apple: "/logo.png" },
  openGraph: {
    title: "Soul",
    description:
      "An AI companion whose memory lives on decentralized 0G Storage, minted as an NFT on the 0G chain.",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "Soul" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Soul",
    description:
      "An AI companion whose memory lives on decentralized 0G Storage, minted as an NFT on the 0G chain.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${vt323.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="crt-bg crt-overlay min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
