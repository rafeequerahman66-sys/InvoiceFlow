export type DonutSegment = { label: string; value: number; color: string };

const R = 54;
const C = 2 * Math.PI * R;

/** SVG donut (r=54, stroke 15, track #1E2127) for invoice-status breakdown. */
export function StatusDonut({ segments, centerLabel }: { segments: DonutSegment[]; centerLabel: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width="120" height="120" viewBox="0 0 140 140" className="shrink-0">
        <g transform="rotate(-90 70 70)">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--divider)" strokeWidth="15" />
          {total > 0 &&
            segments.map((seg, i) => {
              const frac = seg.value / total;
              const dash = frac * C;
              const el = (
                <circle
                  key={i}
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="15"
                  strokeDasharray={`${dash.toFixed(2)} ${(C - dash).toFixed(2)}`}
                  strokeDashoffset={(-offset).toFixed(2)}
                />
              );
              offset += dash;
              return el;
            })}
        </g>
        <text x="70" y="66" textAnchor="middle" fill="var(--text)" style={{ fontSize: 20, fontWeight: 800 }}>
          {total}
        </text>
        <text x="70" y="84" textAnchor="middle" fill="var(--text-dim)" style={{ fontSize: 10 }}>
          {centerLabel}
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-[12.5px]">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: seg.color }} />
            <span className="text-[var(--text-mid)]">{seg.label}</span>
            <span className="tnum font-semibold text-[var(--text)]">
              {total > 0 ? Math.round((seg.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
