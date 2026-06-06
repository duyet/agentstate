import { Tag } from "./bits";
import { FRAMEWORKS, FwGlyph } from "./frameworks";
import { Logo } from "./logo";

const W = 520;
const H = 440;

/**
 * Hero "adapter topology" diagram — the AgentState core wired to every adapter
 * with animated dashed links. SVG for the wiring, HTML overlays for crisp
 * text/glyphs.
 */
export function AdapterHub({ compact = false }: { compact?: boolean }) {
  const cx = W / 2;
  const cy = H / 2;
  const nodes = FRAMEWORKS.map((f, i) => {
    const ang = (-90 + i * (360 / FRAMEWORKS.length)) * (Math.PI / 180);
    const rx = 196;
    const ry = 168;
    return {
      ...f,
      x: cx + Math.cos(ang) * rx,
      y: cy + Math.sin(ang) * ry,
      i,
    };
  });

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <span className="as-label">Adapter&nbsp;topology</span>
        <span className="as-label text-faint">one&nbsp;api&nbsp;·&nbsp;n&nbsp;runtimes</span>
      </div>

      <div className="dot-grid relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" aria-hidden="true">
          {/* static links */}
          {nodes.map((n) => (
            <line
              key={`l${n.i}`}
              x1={cx}
              y1={cy}
              x2={n.x}
              y2={n.y}
              stroke="var(--border)"
              strokeWidth={1.5}
            />
          ))}
          {/* animated dashed links */}
          {nodes.map((n) => (
            <line
              key={`a${n.i}`}
              x1={cx}
              y1={cy}
              x2={n.x}
              y2={n.y}
              className="as-dash"
              stroke="var(--brand-line)"
              strokeWidth={1.5}
              strokeDasharray="2 14"
              strokeLinecap="round"
              style={{ animation: `as-dash ${2.4 + n.i * 0.25}s linear infinite` }}
            />
          ))}
          {/* satellite nodes */}
          {nodes.map((n) => (
            <circle
              key={`n${n.i}`}
              cx={n.x}
              cy={n.y}
              r={22}
              fill="var(--card)"
              stroke="var(--border)"
              strokeWidth={1.5}
            />
          ))}
          {/* core */}
          <circle
            cx={cx}
            cy={cy}
            r={46}
            fill="var(--card)"
            stroke="var(--foreground)"
            strokeWidth={1.5}
          />
          <circle
            cx={cx}
            cy={cy}
            r={46}
            fill="none"
            stroke="var(--brand)"
            strokeWidth={1.5}
            strokeDasharray="3 7"
            className="as-dash"
            style={{ animation: "as-dash 5s linear infinite" }}
            opacity={0.5}
          />
        </svg>

        {/* HTML overlays for crisp text/glyphs */}
        <div className="pointer-events-none absolute inset-0">
          {nodes.map((n) => (
            <div
              key={`g${n.i}`}
              title={n.name}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%` }}
            >
              <FwGlyph kind={n.glyph} size={20} />
            </div>
          ))}
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-foreground">
            <Logo size={30} />
            <span className="font-mono text-[10.5px] font-semibold tracking-[0.06em]">
              AGENTSTATE
            </span>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-1.5 border-t border-line-soft px-4 py-3">
          {FRAMEWORKS.map((f) => (
            <Tag key={f.id}>{f.name}</Tag>
          ))}
        </div>
      )}
    </div>
  );
}
