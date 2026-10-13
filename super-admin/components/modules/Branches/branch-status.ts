import { TONES, type StatusMeta } from "@/lib/constants/labels";

/** Branch on/off state (no shared meta exists in labels.ts yet). */
export const BRANCH_STATUS: Record<"active" | "inactive", StatusMeta> = {
  active: { label: "نشط", tone: TONES.success },
  inactive: { label: "متوقف", tone: TONES.neutral },
};

/** "3 فروع" / "فرعان" style count label. */
export function branchesLabel(n: number): string {
  if (n === 0) return "لا فروع";
  if (n === 1) return "فرع واحد";
  if (n === 2) return "فرعان";
  return `${n} ${n <= 10 ? "فروع" : "فرعًا"}`;
}
