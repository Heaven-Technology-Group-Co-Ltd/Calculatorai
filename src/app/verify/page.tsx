import type { Metadata } from "next";
import { VerifyClient } from "@/components/verify/VerifyClient";

export const metadata: Metadata = {
  title: "ยืนยันบัญชีผู้ใช้ | Verify Account",
  description: "ยืนยันการลงทะเบียนบัญชี Premium Math Calculator ผ่านอีเมล",
};

export default function VerifyPage() {
  return <VerifyClient />;
}
