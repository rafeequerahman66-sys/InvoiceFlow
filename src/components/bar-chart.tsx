export type BarPoint = { label: string; value: number };

/** Hand-rolled SVG vertical bar chart (accent bars, rounded tops). */
export function BarChart({ data }: { data: BarPoint[] }) {
  const W = 640;
  const H = 220;
  const pad = { top: 14, right: 8, bottom: 26, left: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const n = Math.max(1, data.length);
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = innerW / n;
  const barW = Math.min(34, slot * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[200px] w-full">
      <line
        x1={pad.left}
        y1={pad.top + innerH}
        x2={pad.left + innerW}
        y2={pad.top + innerH}
        stroke="var(--divider)"
        strokeWidth={1}
      />
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = pad.left + i * slot + (slot - barW) / 2;
        const y = pad.top + innerH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={Math.max(0, h)} rx={5} fill="var(--accent)" />
            <text x={x + barW / 2} y={pad.top + innerH + 17} textAnchor="middle" fill="var(--text-faint)" style={{ fontSize: 10 }}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
