import type { Metadata } from "next";
import { StatusClient } from "./StatusClient";

export const metadata: Metadata = {
  title: "สถานะระบบ | System Status",
  description: "ตรวจสอบความพร้อมใช้งานและสถานะการทำงานของบริการทั้งหมดแบบเรียลไทม์",
};

export default function StatusPage() {
  return <StatusClient />;
}
