export const COLORS = {
  white: { hex: "#F4F7FB", ar: "أبيض", en: "White" },
  black: { hex: "#1C1C1E", ar: "أسود", en: "Black" },
  silver: { hex: "#C5CDD6", ar: "فضي", en: "Silver" },
  gray: { hex: "#6B7280", ar: "رمادي", en: "Gray" },
  blue: { hex: "#2563EB", ar: "أزرق", en: "Blue" },
  red: { hex: "#DC2626", ar: "أحمر", en: "Red" },
  green: { hex: "#15803D", ar: "أخضر", en: "Green" },
  beige: { hex: "#D6C4A8", ar: "بيج", en: "Beige" },
};

export function colorHex(key) {
  return (COLORS[key] || COLORS.silver).hex;
}
