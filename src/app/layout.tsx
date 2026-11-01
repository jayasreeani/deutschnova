import type { Metadata } from "next";
import "./globals.css";
import "./tailwind.output.css";
import { LearningProvider } from "@/context/LearningContext";

export const metadata: Metadata = {
  title: "DeutschNova — AI German Real-Life Readiness Coach",
  description:
    "Move from learning German to confidently using German in real-life situations. Mobile-first A1 day-by-day curriculum ('My First Week in Austria').",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100">
        <LearningProvider>{children}</LearningProvider>
      </body>
    </html>
  );
}
