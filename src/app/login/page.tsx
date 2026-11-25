import type { Metadata } from "next";
import { LoginClient } from "@/components/login/LoginClient";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | Sign In",
  description: "เข้าสู่ระบบ Premium Math Calculator เพื่อบันทึกประวัติการคำนวณและใช้งานฟีเจอร์พรีเมียม",
};

export default function LoginPage() {
  return <LoginClient />;
}
