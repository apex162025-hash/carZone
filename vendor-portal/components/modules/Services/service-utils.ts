import type { ServiceType } from "@carzen/contracts/washes";

export const SERVICE_TYPE_LABEL: Record<ServiceType, { label: string; plural: string; hint: string }> = {
  primary: { label: "خدمة أساسية", plural: "الخدمات الأساسية", hint: "يختار العميل خدمة أساسية واحدة في كل طلب." },
  addon: { label: "إضافة", plural: "الإضافات", hint: "اختيارية فوق الخدمة الأساسية — تُضاف للسعر والمدة." },
};

export const PRICE_MIN = 10;
export const PRICE_MAX = 5000;
export const DURATION_MIN = 2;
export const DURATION_MAX = 240;
