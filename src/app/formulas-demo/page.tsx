import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormulasDemoClient } from "./FormulasDemoClient";
import { isFormulasDemoEnabled } from "@/lib/formulas-demo-gate";

// The gate reads the env flag per request; a static prerender would bake the
// build-time decision and ignore ENABLE_FORMULAS_DEMO set at `next start`.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "คลังสูตรคณิตศาสตร์ & ฟิสิกส์ | Formulas Gallery",
  description: "คลังสูตรคำนวณคณิตศาสตร์ ฟิสิกส์ เคมี และวิศวกรรม พร้อมตัวอย่างการใช้งานแบบอินเตอร์แอคทีฟ",
};

export default function FormulasDemoPage() {
  if (!isFormulasDemoEnabled(process.env.NODE_ENV, process.env.ENABLE_FORMULAS_DEMO)) {
    notFound();
  }
  return <FormulasDemoClient />;
}
