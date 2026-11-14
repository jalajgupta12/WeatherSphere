import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WeatherSphere — Weather, beautifully clear",
  description: "A premium live weather and air-quality dashboard powered by Open-Meteo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
