---
tags: [bridge, system, external]
status: active
last-updated: 2026-07-23
---

# 🌉 System Bridges

> สะพานเชื่อมระหว่าง Obsidian vault กับระบบภายนอก (CLAUDE.md, AGENTS.md, RULE.md, Log.txt, Claude Memory)
> **Keep updated!** ไฟล์ทุกตัวในที่นี้อาจเปลี่ยน — อัปเดตลิงก์เมื่อมีการปรับโครงสร้าง

---

## 📋 Log.txt — Working Memory

| Property | Value |
|---|---|
| **Location** | `../Log.txt` (repo root) |
| **Purpose** | Session progress log — บันทึกกลาง session |
| **Format** | `[YYYY-MM-DD HH:MM] <what> — <why> — <files>` |
| **Relation to vault** | Log.txt = ขณะทำงาน | vault notes = หลังทำงานเสร็จ |

**Workflow:**
```
ระหว่างทำงาน → Log.txt (สั้น, ไว)
หลังเสร็จงาน → 03-Sessions/ (สรุป), 01-Decisions/ (ถ้ามี decision)
```

➡️ [Open Log.txt](../Log.txt)

---

## 🤖 CLAUDE.md — AI Agent Instructions

| Property | Value |
|---|---|
| **Location** | `../CLAUDE.md` |
| **Purpose** | 规则 Claude Code behavior — scope, stack, rules |
| **Key sections** | Project Identity, Stack, Version Watch, Core Behavior Rules, SecondBrain |

➡️ [Open CLAUDE.md](../CLAUDE.md)

**Second Brain Section (current):**
> **SecondBrain (Obsidian Vault)**
> - Location: `./math-calculator-vault/`
> - Search vault by tag/keyword (NOT full load) before major decisions
> - After sessions with decisions → propose note in `01-Decisions/`
> - Do not load entire vault

---

## 🔧 AGENTS.md — Cross-Tool Agent Instructions

| Property | Value |
|---|---|
| **Location** | `../AGENTS.md` |
| **Purpose** | Tool-agnostic agent rules (Opencode, Claude Code, etc.) |
| **Key sections** | Priority Order, Model Routing, Session Startup Checklist, Multi-Agent Handoff |

➡️ [Open AGENTS.md](../AGENTS.md)

---

## 📏 RULE.md — Coding Standards & Quality Gates

| Property | Value |
|---|---|
| **Location** | `../RULE.md` |
| **Purpose** | Quality gates, code org, styling rules |
| **Key gates** | Build passes, responsive check, calc logic isolation, Log.txt updated |

➡️ [Open RULE.md](../RULE.md)

---

## 🧠 Claude Memory — AI Context

| Property | Value |
|---|---|
| **Location** | `.claude/memory/` (outside repo — `C:\Users\Administrator\.claude\projects\d--testtt-Web-project-projectreal-webrebuild\memory\`) |
| **Purpose** | Persistent preferences, project facts, feedback for AI agents |
| **Index** | `MEMORY.md` — one-liner per memory file |

**Memory files (21):**
| Memory | Type |
|---|---|
| Senior Engineer Identity | user |
| Working Principles | feedback |
| Quality Standards | feedback |
| Project Architecture | project |
| Loading Screen + SplashGate | project |
| Formula Library Architecture | project |
| CLI Model Set | reference |
| Gridgeist Redesign | project |
| Design Anti-Patterns | feedback |
| History Persistence | project |
| Discord Bot Azura | project |
| Premium Redux Redesign | project |
| Ursa Palette Redesign | project |
| Sidebar Layout Resolution | project |
| Code Quality Fixes | project |
| Department Filtering | project |
| Dashboard Responsive Redesign | project |
| Purchase Page Responsive | project |
| Second Brain System | project |
| 404 Not Found Page | project |
| Login Page Design | project |
| Departments Phase 1 | project |
| Sidebar Scrollable Nav | project |

---

## 🔄 Sync Workflow

```
ทำอะไรเสร็จ → อัปเดต:
  1. Log.txt (ระหว่าง session)
  2. 03-Sessions/YYYY-MM-DD--summary.md (หลัง session)
  3. 01-Decisions/ (ถ้ามี decision ใหม่)
  4. 02-Architecture/ (ถ้าโครงสร้างเปลี่ยน)
  5. System-Bridges.md (ถ้า path หรือ external file เปลี่ยน)
  6. Vault-Dashboard.base (ถ้าเพิ่ม views)
```

---

## 🔗 Internal Links

- [[Project-Brain-Map]] ← MOC หลัก
- [[Vault-Dashboard.base]] ← Dashboard
- [[03-Sessions/]] ← Session notes
- [[01-Decisions/]] ← Decisions
- [[02-Architecture/]] ← Architecture
