# 🧠 Premium Math Calculator — Second Brain

> **สมองที่สองของโปรเจกต์** — ทุกสิ่งที่ AI Agents และ Developers ต้องรู้
> ครอบคลุม: โค้ด | การตัดสินใจ | สถาปัตยกรรม | การออกแบบ | จุดบกพร่อง

---

## 📊 Dashboard

![[Vault-Dashboard.base#📊 Vault Dashboard]]

---

## 🧭 Brain Map

| Compartment | Location | ใช้เก็บอะไร |
|---|---|---|
| **Decisions** | `01-Decisions/` | ADR-style: อะไรถูกตัดสินใจ, ทำไม, reject อะไร |
| **Architecture** | `02-Architecture/` | โครงสร้างระบบปัจจุบัน (แก้ไขได้เรื่อยๆ) |
| **Sessions** | `03-Sessions/` | สรุปแต่ละ session สั้นๆ 5-10 บรรทัด |
| **Templates** | `04-Templates/` | copy ไปใช้ ไม่แก้ของเดิม |
| **Claude Memory** | `.claude/memory/` | Context สำหรับ AI agents (auto-managed) |
| **Coding Rules** | `CLAUDE.md` + `RULE.md` | กฏการเขียนโค้ด和质量 gates |
| **Log** | `Log.txt` | Working memory — progress ระหว่าง session |

---

## 🔄 Workflow

```
📥 คิดอะไรได้ → 00-Inbox/ (หรือ Log.txt)
💡 ตัดสินใจอะไร → 01-Decisions/
🏗️ เปลี่ยนโครงสร้าง → 02-Architecture/
📝 จบ session → 03-Sessions/
```

**สำหรับ Claude Code:** อ่าน `01-Decisions/` และ `02-Architecture/` ก่อนทำงานใหญ่ทุกครั้ง

**สำหรับมนุษย์:** เปิด `Vault-Dashboard.base` ใน Obsidian เพื่อดูภาพรวม vault

---

## 📁 Structure

```
math-calculator-vault/
├── 00-Inbox/          # Quick capture — ยังไม่จัดหมวด
├── 01-Decisions/      # ADR-style decisions (historical, immutable)
├── 02-Architecture/   # System architecture (living docs, editable)
├── 03-Sessions/       # Session summaries
├── 04-Templates/      # Copy-only templates
├── Vault-Dashboard.base  # 🎛️ Command Center (open this!)
└── README.md          # ← You are here
```

---

> 💡 **Second Brain Tip:** ยิ่งมี `[[links]]` ระหว่าง notes มากเท่าไหร่ สมองที่สองยิ่งฉลาดมากขึ้นเท่านั้น — dashboard จะช่วยจับ notes ที่ไม่มี link ได้ใน Orphans view
