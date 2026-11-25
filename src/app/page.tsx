import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { SplashGate } from "@/components/SplashGate";

export const metadata: Metadata = {
  title: "Premium Math Calculator | เครื่องคิดเลขคณิตศาสตร์ & วิทยาศาสตร์",
  description: "เครื่องคำนวณคณิตศาสตร์และวิทยาศาสตร์ขั้นสูงสำหรับทุกระดับชั้น พร้อมสูตร คำอธิบาย และวิธีคิดแบบละเอียด",
};

export default function Home() {
  return (
    <SplashGate>
      <AppShell />
    </SplashGate>
  );
}
