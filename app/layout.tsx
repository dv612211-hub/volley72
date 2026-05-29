import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "./_components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Volley72 — волейбол в Тюмени",
  description: "Платформа для волейболистов Тюмени. Игры, турниры, тренировки и площадки для пляжного и классического волейбола.",
  keywords: ["волейбол Тюмень", "пляжный волейбол Тюмень", "турниры волейбол", "тренировки волейбол", "Volley72"],
  authors: [{ name: "Volley72" }],
  creator: "Volley72",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://volley72.ru",
    siteName: "Volley72",
    title: "Volley72 — волейбол в Тюмени",
    description: "Платформа для волейболистов Тюмени. Игры, турниры, тренировки и площадки для пляжного и классического волейбола.",
    images: [
      {
        url: "https://volley72.ru/og-image.png",
        width: 1200,
        height: 630,
        alt: "Volley72 — волейбол в Тюмени",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Volley72 — волейбол в Тюмени",
    description: "Игры, турниры, тренировки и площадки для волейболистов Тюмени.",
    images: ["https://volley72.ru/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col"
        suppressHydrationWarning
      >
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
