export type BarPoint = { label: string; value: number };

/** Hand-rolled SVG vertical bar chart (accent bars, rounded tops). */
export function BarChart({ data, showYAxis = true }: { data: BarPoint[]; showYAxis?: boolean }) {
  const W = 640;
  const H = 220;
  const pad = { top: 16, right: 8, bottom: 30, left: showYAxis ? 48 : 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const n = Math.max(1, data.length);
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = innerW / n;
  const barW = Math.min(34, slot * 0.55);

  // Y-axis tick values (4 ticks)
  const yTicks = [0, 0.33, 0.66, 1].map((t) => ({
    val: max * t,
    y: pad.top + innerH - t * innerH,
  }));

  const fmt = (v: number) =>
    v >= 1_00_000 ? `₹${(v / 1_00_000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v.toFixed(0)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[180px] w-full sm:h-[210px]">
      {/* Y-axis gridlines */}
      {showYAxis && yTicks.map(({ val, y }) => (
        <g key={val}>
          <line x1={pad.left} y1={y} x2={pad.left + innerW} y2={y} stroke="var(--divider)" strokeWidth={1} strokeDasharray="3 3" />
          <text x={pad.left - 6} y={y + 4} textAnchor="end" fill="var(--text-faint)" style={{ fontSize: 9 }}>
            {fmt(val)}
          </text>
        </g>
      ))}
      {/* Baseline */}
      <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="var(--divider)" strokeWidth={1} />
      {data.map((d, i) => {
        const h = Math.max(0, (d.value / max) * innerH);
        const x = pad.left + i * slot + (slot - barW) / 2;
        const y = pad.top + innerH - h;
        // Shorten label to 3 chars for crowded charts
        const label = n > 8 ? d.label.slice(-3) : d.label;
        return (
          <g key={i}>
            {h > 0 && <rect x={x} y={y} width={barW} height={h} rx={4} fill="var(--accent)" />}
            <text x={x + barW / 2} y={pad.top + innerH + 18} textAnchor="middle" fill="var(--text-faint)" style={{ fontSize: n > 8 ? 8.5 : 10 }}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
