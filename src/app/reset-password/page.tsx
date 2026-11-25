import type { Metadata } from "next";
import ResetPasswordClient from "@/components/ResetPasswordClient";

export const metadata: Metadata = {
  title: "ตั้งรหัสผ่านใหม่ | Reset Password",
  description: "ตั้งค่ารหัสผ่านใหม่สำหรับบัญชี Premium Math Calculator ของคุณ",
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
