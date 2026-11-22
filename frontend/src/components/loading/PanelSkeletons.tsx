import type { ReactNode } from 'react';

/** A single shimmering placeholder bar. `w` and `h` set its size; everything else is layout. */
function Bone({ w, h = 16, round = 8 }: { w?: number | string; h?: number; round?: number }) {
  const style: Record<string, string | number> = { height: h, borderRadius: round };
  if (w !== undefined) style.width = w;
  return <i className="ld-bone" style={style} />;
}

/** Overview / home pages: a stat row, then a chart block beside an activity feed — the shape every dashboard shares. */
function DashboardSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div className="ld-sk">
      <Bone w={240} h={30} round={10} />
      <div className="p-stats">
        {Array.from({ length: stats }, (_, i) => (
          <div className="p-stat" key={i}>
            <Bone w="60%" h={12} />
            <Bone w="45%" h={26} round={6} />
          </div>
        ))}
      </div>
      <div className="p-dashboard-split">
        <div className="p-dashboard-main">
          <div className="p-chart-card ld-sk-block">
            <Bone w={160} h={18} />
            <Bone w="100%" h={180} round={16} />
          </div>
        </div>
        <div className="p-dashboard-side">
          <div className="p-activity-card ld-sk-block">
            <Bone w={120} h={18} />
            {Array.from({ length: 4 }, (_, i) => (
              <div className="ld-sk-row" key={i}>
                <Bone w={28} h={28} round={14} />
                <div className="ld-sk-row-text"><Bone w="80%" /><Bone w="40%" h={11} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** List pages: a page description line, then one card holding table-shaped rows. */
function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="ld-sk">
      <Bone w={320} h={14} />
      <div className="p-card ld-sk-block">
        <div className="ld-sk-trow ld-sk-thead" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }, (_, i) => <Bone key={i} w="50%" h={11} />)}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div className="ld-sk-trow" key={row} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }, (_, col) => <Bone key={col} w={col === 0 ? '75%' : '55%'} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Roles & access: one card per person, the same shape as the real rx-card. */
function PeopleSkeleton() {
  return (
    <div className="ld-sk">
      <Bone w={280} h={14} />
      <div className="ld-sk-chiprow">{Array.from({ length: 6 }, (_, i) => <Bone key={i} w={84} h={36} round={999} />)}</div>
      <div className="rx-list">
        {Array.from({ length: 4 }, (_, i) => (
          <div className="rx-card ld-sk-block" key={i}>
            <div className="rx-who">
              <Bone w={48} h={48} round={999} />
              <div className="ld-sk-row-text"><Bone w={160} h={15} /><Bone w={200} h={12} /></div>
            </div>
            <div className="ld-sk-chiprow">{Array.from({ length: 4 }, (_, c) => <Bone key={c} w={76} h={32} round={999} />)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Audit log: day label, then rows the same shape as the real al-row. */
function AuditSkeleton() {
  return (
    <div className="ld-sk">
      <Bone w={320} h={14} />
      <div className="ld-sk-chiprow">{Array.from({ length: 4 }, (_, i) => <Bone key={i} w={76} h={34} round={999} />)}</div>
      <Bone w={130} h={12} />
      <div className="al-list">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="al-row ld-sk-block" key={i}>
            <Bone w={42} h={42} round={13} />
            <div className="ld-sk-row-text"><Bone w="60%" /><Bone w="30%" h={11} /></div>
            <Bone w={46} h={12} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Settings: the four-card bento grid, each card the size of the real one. */
function SettingsSkeleton() {
  return (
    <div className="ld-sk">
      <Bone w={260} h={14} />
      <div className="st-grid">
        {([['st-attendance', 372], ['st-certificates', 372], ['st-name', 316], ['st-payment', 316]] as const).map(([area, height]) => (
          <div className={`st-card ${area} ld-sk-block`} key={area} style={{ minHeight: height }}>
            <Bone w={40} h={40} round={12} />
            <Bone w="70%" h={16} />
            <Bone w="100%" h={60} round={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Manager's batch detail: a stat row above two stacked tables. */
function DetailSkeleton() {
  return (
    <div className="ld-sk">
      <Bone w={260} h={26} round={10} />
      <div className="p-stats">
        {Array.from({ length: 4 }, (_, i) => (
          <div className="p-stat" key={i}><Bone w="55%" h={12} /><Bone w="40%" h={22} round={6} /></div>
        ))}
      </div>
      <TableSkeleton rows={4} cols={3} />
    </div>
  );
}

/** "Open any panel": a row of button-shaped blocks. */
function LinksSkeleton() {
  return (
    <div className="ld-sk">
      <Bone w={260} h={14} />
      <div className="p-row ld-sk-chiprow">{Array.from({ length: 5 }, (_, i) => <Bone key={i} w={110} h={44} round={12} />)}</div>
    </div>
  );
}

export type SkeletonKind = 'dashboard' | 'table' | 'people' | 'audit' | 'settings' | 'detail' | 'links';

/** Route endings mapped to the skeleton that matches what that page actually renders. */
const ENDS: [RegExp, SkeletonKind][] = [
  [/\/roles$/, 'people'],
  [/\/audit-log$/, 'audit'],
  [/\/settings$/, 'settings'],
  [/\/panels$/, 'links'],
  [/\/batches\/[^/]+$/, 'detail'],
];
const HOME = /^\/(app|trainer|manager|finance|superadmin)(\/overview)?$|^\/admin(\/overview)?$/;

export function skeletonKindFor(pathname: string): SkeletonKind {
  for (const [pattern, kind] of ENDS) if (pattern.test(pathname)) return kind;
  if (HOME.test(pathname)) return 'dashboard';
  return 'table';
}

export function PanelSkeleton({ kind }: { kind: SkeletonKind }): ReactNode {
  switch (kind) {
    case 'dashboard': return <DashboardSkeleton />;
    case 'people': return <PeopleSkeleton />;
    case 'audit': return <AuditSkeleton />;
    case 'settings': return <SettingsSkeleton />;
    case 'detail': return <DetailSkeleton />;
    case 'links': return <LinksSkeleton />;
    default: return <TableSkeleton />;
  }
}
