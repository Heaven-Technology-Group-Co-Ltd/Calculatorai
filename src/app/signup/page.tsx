import type { Metadata } from "next";
import { SignUpClient } from "@/components/signup/SignUpClient";

export const metadata: Metadata = {
  title: "สมัครสมาชิก | Create Account",
  description: "สร้างบัญชีผู้ใช้ใหม่สำหรับ Premium Math Calculator เริ่มต้นใช้งานฟรี",
};

export default function SignUpPage() {
  return <SignUpClient />;
}
