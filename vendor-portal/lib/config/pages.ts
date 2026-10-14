import type { Metadata } from "next";

export const SITE_NAME = "Carzen Partners";

/** Central page metadata (Arabic titles), mirroring aroma's `lib/config/pages.ts`. */
export const pagesConfig = {
  "/login": { title: "تسجيل الدخول", description: "دخول بوابة شركاء كارزن لملاك ومديري المغاسل" },
  "/dashboard": { title: "الرئيسية", description: "أرقام اليوم والفروع المباشرة والتنبيهات" },
  "/live": { title: "التشغيل المباشر", description: "لوحة السيارات داخل الفرع الآن" },
  "/bookings": { title: "الحجوزات", description: "حجوزات التطبيق والهاتف" },
  "/orders": { title: "الطلبات", description: "كل طلبات الخدمة" },
  "/orders/[id]": { title: "تفاصيل الطلب", description: "القصة الكاملة للطلب" },
  "/schedule": { title: "الجدول والسعة", description: "الأماكن المشغولة والمتاحة وحجب الفترات" },
  "/services": { title: "الخدمات والأسعار", description: "قائمة الخدمات والإضافات" },
  "/offers": { title: "العروض", description: "عروض المغسلة" },
  "/staff": { title: "الموظفون", description: "فريق المغسلة والأداء" },
  "/shifts": { title: "الورديات والإغلاق", description: "مراجعة الورديات وإغلاق اليوم" },
  "/customers": { title: "العملاء", description: "عملاء المغسلة" },
  "/customers/[id]": { title: "ملف العميل", description: "سجل زيارات العميل" },
  "/reviews": { title: "التقييمات", description: "آراء العملاء والرد عليها" },
  "/reports": { title: "التقارير", description: "تقارير الطلبات والإيرادات والخدمات" },
  "/finance": { title: "المالية", description: "الإيرادات والعمولة والمستحقات" },
  "/branches": { title: "الفروع", description: "بيانات الفروع وساعات العمل وقواعد الحجز" },
  "/audit": { title: "سجل التدقيق", description: "سجل كل الإجراءات على المغسلة" },
  "/notifications": { title: "الإشعارات", description: "إشعارات المغسلة" },
  "/settings": { title: "الإعدادات", description: "بيانات المغسلة والصلاحيات والإشعارات" },
} as const;

export type PagesConfigPath = keyof typeof pagesConfig;

export function getStaticPageMetadata(path: PagesConfigPath): Metadata {
  const page = pagesConfig[path];
  return { title: page.title, description: page.description };
}
