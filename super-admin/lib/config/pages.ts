import type { Metadata } from "next";

export const SITE_NAME = "Carzen Super Admin";

/** Central page metadata (Arabic titles), mirroring aroma's `lib/config/pages.ts`. */
export const pagesConfig = {
  "/login": { title: "تسجيل الدخول", description: "دخول لوحة السوبر أدمن لمنصة كارزن" },
  "/dashboard": { title: "لوحة المؤشرات", description: "مؤشرات المنصة اللحظية والتنبيهات" },
  "/washes": { title: "المغاسل", description: "إدارة المغاسل الشريكة وحالاتها" },
  "/washes/[id]": { title: "تفاصيل المغسلة", description: "الملف الكامل للمغسلة" },
  "/applications": { title: "طلبات الانضمام", description: "مراجعة طلبات انضمام المغاسل" },
  "/applications/[id]": { title: "مراجعة طلب", description: "مراجعة طلب انضمام مغسلة" },
  "/branches": { title: "الفروع", description: "كل فروع المغاسل على المنصة" },
  "/orders": { title: "الحجوزات والطلبات", description: "متابعة كل الحجوزات على المنصة" },
  "/orders/[id]": { title: "تفاصيل الحجز", description: "القصة الكاملة للحجز" },
  "/customers": { title: "العملاء", description: "إدارة حسابات العملاء" },
  "/customers/[id]": { title: "ملف العميل", description: "الصورة الكاملة للعميل" },
  "/staff": { title: "الملاك والموظفون", description: "حسابات ملاك وموظفي المغاسل" },
  "/complaints": { title: "الشكاوى", description: "صندوق الشكاوى والدعم" },
  "/complaints/[id]": { title: "تفاصيل الشكوى", description: "معالجة الشكوى" },
  "/reviews": { title: "التقييمات", description: "مراقبة وإدارة التقييمات" },
  "/offers": { title: "عروض المنصة", description: "العروض الترويجية على مستوى المنصة" },
  "/finance": { title: "الملخص المالي", description: "إجمالي المبيعات والعمولات" },
  "/finance/transactions": { title: "المعاملات", description: "دفتر المعاملات المالية" },
  "/finance/commission": { title: "العمولات", description: "إعدادات عمولة المنصة" },
  "/finance/payouts": { title: "مدفوعات المغاسل", description: "متابعة مستحقات المغاسل" },
  "/admins": { title: "المسؤولون", description: "حسابات فريق الإدارة" },
  "/roles": { title: "الأدوار والصلاحيات", description: "مصفوفة صلاحيات الأدوار" },
  "/settings": { title: "إعدادات المنصة", description: "الإعدادات العامة والكتالوجات" },
  "/audit": { title: "سجل التدقيق", description: "سجل غير قابل للتعديل لكل الإجراءات الحساسة" },
  "/notifications": { title: "الإشعارات", description: "إشعارات الإدارة" },
} as const;

export type PagesConfigPath = keyof typeof pagesConfig;

export function getStaticPageMetadata(path: PagesConfigPath): Metadata {
  const page = pagesConfig[path];
  return { title: page.title, description: page.description };
}
