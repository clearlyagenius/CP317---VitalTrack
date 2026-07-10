import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VitalTrack — Personal Health Tracker",
  description:
    "Track your blood test results, set medication reminders, and take control of your health.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
