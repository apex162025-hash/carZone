import { useId } from "react";

type SparklineProps = {
  data: number[];
  /** CSS color for the line (and its 10% area wash). */
  color?: string;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Dependency-free SVG sparkline: 2px line, faint area wash, end dot with a
 * surface ring. Decorative (the KPI value carries the information).
 */
export function Sparkline({ data, color = "var(--primary)", width = 96, height = 32, className }: SparklineProps) {
  const id = useId();
  if (data.length < 2) return null;

  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = (width - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    // RTL: time flows right → left, so the newest point sits on the left.
    const x = width - pad - i * step;
    const y = pad + (height - pad * 2) * (1 - (v - min) / range);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${height} L${points[0][0].toFixed(1)},${height} Z`;
  const [ex, ey] = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.16} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ex} cy={ey} r={3.5} fill={color} stroke="var(--card)" strokeWidth={2} />
    </svg>
  );
}
