import type { Metadata } from "next";
import { Lora } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font, so no request leaves for Google at runtime.
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "ChaosCaiet",
  description: "A private journal.",
  // A diary: keep it out of every index.
  robots: { index: false, follow: false },
};

// Runs before paint so the light theme never flashes dark first. Also reports
// the browser's timezone, since the Worker runs in UTC (see lib/time.ts).
const themeScript = `try{if(localStorage.getItem("caiet:theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}try{document.cookie="caiet_tz="+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)+";path=/;max-age=31536000;samesite=lax;secure"}catch(e){}`;

const RootLayout = ({ children }: LayoutProps<"/">): React.ReactNode => (
  <html lang="en" suppressHydrationWarning className={`${lora.variable} h-full antialiased`}>
    <head>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
    </head>
    <body className="min-h-full">{children}</body>
  </html>
);

export default RootLayout;
