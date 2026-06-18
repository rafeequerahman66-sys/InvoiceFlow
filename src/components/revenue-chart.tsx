export type MonthPoint = { label: string; value: number };

/**
 * Hand-rolled SVG area chart (no charting dep — avoids React 19 peer issues).
 * Accent line + gradient fill, matching the handoff's Monthly Revenue card.
 */
export function RevenueChart({ data }: { data: MonthPoint[] }) {
  const W = 640;
  const H = 200;
  const padX = 8;
  const padTop = 14;
  const padBottom = 26;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const n = Math.max(1, data.length);
  const max = Math.max(1, ...data.map((d) => d.value));

  const x = (i: number) => padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => padTop + innerH - (v / max) * innerH;

  const pts = data.map((d, i) => [x(i), y(d.value)] as const);
  const line = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  const area = pts.length
    ? `${line} L${x(n - 1).toFixed(1)} ${(padTop + innerH).toFixed(1)} L${x(0).toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[190px] w-full">
      <defs>
        <linearGradient id="revfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill="url(#revfill)" />}
      {line && <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {data.map((d, i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          fill="var(--text-faint)"
          style={{ fontSize: 10 }}
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}
