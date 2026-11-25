import type { Metadata } from "next";
import { Suspense } from "react";
import { PurchaseClient } from "@/components/purchase/PurchaseClient";

export const metadata: Metadata = {
  title: "อัปเกรดเป็นพรีเมียม | Premium Plans & Pricing",
  description: "เลือกแพ็กเกจพรีเมียมเพื่อปลดล็อกฟังก์ชันขั้นสูง ประวัติไม่จำกัด และการคำนวณความแม่นยำสูง",
};

export default function PurchasePage() {
  return (
    <Suspense fallback={null}>
      <PurchaseClient />
    </Suspense>
  );
}
