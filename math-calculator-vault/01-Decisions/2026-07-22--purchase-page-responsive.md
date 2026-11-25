---
tags: [decision]
status: active
date: 2026-07-22
---

# Decision: Purchase Page Responsive Redesign + Sidebar Purchase Link

## Context
หน้าซื้อ (`/purchase`) มีอยู่แล้วและมี Stripe checkout เรียบร้อย แต่:
- Sidebar หลักไม่มีลิงก์ไปยัง `/purchase` เลย
- หน้า purchase ไม่ responsive จริง ๆ (มีแค่ planGrid 3→1 column ที่ 768px)
- ไม่มี bottom nav clearance ไม่มี tablet optimization ไม่มี small phone layout

ผู้ใช้ request ให้ทำ responsive ทุกขนาด และให้เพิ่ม ปุ่มซื้อ ใน sidebar section เดียวกับ History และ Info

## Decision
1. **เพิ่ม Purchase button ใน sidebar หลัก** ใช้ `ShoppingCart` icon วางใน footer section ถัดจากปุ่ม Info/วิธีใช้งาน ใช้ `useRouter().push("/purchase")` ในการนำทาง
2. **ออกแบบ responsive 4 breakpoint** สำหรับ purchase page:
   - ≥901px: 3 columns, full padding, 1.8rem header
   - ≤900px: 2 columns, moderate padding
   - ≤640px: 1 column stack, bottom nav clearance 80px
   - ≤400px: compact card padding 14px, smaller font
3. **ย้าย styles ทั้งหมด**จาก globals.css เข้า CSS module (`Purchase.module.css`) เพื่อ scoped styling
4. **ใช้ CSS media queries ล้วน** ไม่พึ่ง JS breakpoint detection

## Alternatives Considered
- **ใช้ JS window.matchMedia** — rejected: เพิ่ม complexity, ต้องการ state management, CSS จัดการดีกว่าสำหรับกรณีนี้
- **เก็บ styles ไว้ใน globals.css อย่างเดียว** — rejected: กระจัดกระจาย, merge conflict สูง, ไม่เป็น module
- **สร้าง PurchaseModal แทนการ navigate** — rejected: มีหน้า `/purchase` อยู่แล้ว, route มี Stripe checkout flow ที่ซับซ้อน

## Consequences
- **ง่ายขึ้น**: Purchase auto-responsive ทุกหน้าจอ, แก้ไข plan ใน PurchaseClient.tsx อย่างเดียว
- **ยากขึ้น**: ต้อง maintain CSS module + media queries ให้สอดคล้องกับระบบ breakpoints ของ project
- **ต้อง revisit**: เมื่อมี backend จริง Stripe integration อาจต้องปรับปรุง UI loading/success states

## Related
- [[dashboard-responsive-redesign]] — pattern เดียวกันที่ใช้กับ dashboard
- [[ursa-palette-redesign]] — ใช้ Ursa palette tokens
- [[sidebar-layout-resolution]] — sidebar structure ที่เพิ่มปุ่มเข้าไป
- [[404-not-found-page]] — responsive standalone page pattern เดียวกัน
