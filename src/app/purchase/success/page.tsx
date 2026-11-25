import type { Metadata } from "next";
import { PurchaseSuccessClient } from "@/components/purchase/PurchaseSuccessClient";

export const metadata: Metadata = {
  title: "การชำระเงินสำเร็จ | Purchase Successful",
  description: "ขอบคุณสำหรับการสนับสนุน บัญชีของคุณได้รับการอัปเกรดเป็นสมาชิกพรีเมียมเรียบร้อยแล้ว",
};

export default function PurchaseSuccessPage() {
  return <PurchaseSuccessClient />;
}
