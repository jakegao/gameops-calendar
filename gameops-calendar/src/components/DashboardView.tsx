import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore.ts';
import { CATEGORY_COLORS, CATEGORY_NAMES } from '../constants/index.ts';
import type { EventCategory } from '../types/index.ts';

/* 简化分类名 */
const CAT_SHORT: Record<string, string> = {
  paid: '付费活动', engagement: '促活活动', version: '版本更新',
  esports: '电竞赛事', marketing: '市场推广',
};

export default function DashboardView() {
  const events = useAppStore((s) => s.events);
  const holidays = useAppStore((s) => s.holidays);
  const openDetailPanel = useAppStore((s) => s.openDetailPanel);

  const total = events.length;
  const active = events.filter((e) => !['completed', 'cancelled'].includes(e.status)).length;
  const completed = events.filter((e) => e.status === 'completed').length;
  const totalRevTarget = events.reduce((s, e) => s + (e.revenueTarget || 0), 0);
  const totalRevActual = events.reduce((s, e) => s + (e.revenueActual || 0), 0);

  const byCat = useMemo(() => (Object.keys(CATEGORY_NAMES) as EventCategory[]).map((cat) => {
    const ce = events.filter((e) => e.category === cat);
    return { cat, label: CAT_SHORT[cat] || CATEGORY_NAMES[cat], color: CATEGORY_COLORS[cat], count: ce.length };
  }), [events]);

  const topRevenue = useMemo(() =>
    [...events].filter((e) => e.revenueActual && e.revenueActual > 0).sort((a, b) => (b.revenueActual || 0) - (a.revenueActual || 0)).slice(0, 5)
  , [events]);

  const monthlyRev = useMemo(() => {
    const labels = ['1月', '2月', '3月', '4月', '5月', '6月'];
    return labels.map((month, m) => {
      const me = events.filter((e) => { try { const d = new Date(e.startDate); return d.getMonth() === m && d.getFullYear() === 2026; } catch { return false; } });
      return { month, target: me.reduce((s, e) => s + (e.revenueTarget || 0), 0), actual: me.reduce((s, e) => s + (e.revenueActual || 0), 0) };
    });
  }, [events]);

  const recommendations = useMemo(() => {
    const now = new Date(2026, 2, 26);
    return holidays.filter((h) => {
      try { const d = new Date(h.date); return d > now && (d.getTime() - now.getTime()) / 86400000 <= 90 && h.isImportant; } catch { return false; }
    }).slice(0, 3).map((h) => {
      const hd = new Date(h.date);
      const nearby = events.filter((e) => { try { return Math.abs((new Date(e.startDate).getTime() - hd.getTime()) / 86400000) <= 7; } catch { return false; } });
      const sug: string[] = [];
      if (!nearby.some((e) => e.category === 'paid')) sug.push('限时礼包/折扣活动');
      if (!nearby.some((e) => e.category === 'engagement')) sug.push('节日主题挑战活动');
      if (!nearby.some((e) => e.category === 'marketing')) sug.push('社交媒体推广Campaign');
      if (sug.length === 0) sug.push('已有完善的活动安排');
      return { name: h.name, monthLabel: `${hd.getMonth() + 1}月`.toUpperCase(), dayLabel: String(hd.getDate()).padStart(2, '0'), suggestions: sug.join('，'), hasGap: nearby.length === 0 };
    });
  }, [holidays, events]);

  const healthScore = useMemo(() => {
    const catCount = (Object.keys(CATEGORY_NAMES) as EventCategory[]).filter((c) => events.some((e) => e.category === c)).length;
    return Math.round(Math.min(100, Math.max(0, (catCount / 5) * 50 + 50 - (events.length > 15 ? 10 : 0))));
  }, [events]);

  const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString();
  const maxRev = Math.max(...monthlyRev.map((m) => Math.max(m.target, m.actual)), 1);
  const maxCatCount = Math.max(...byCat.map((c) => c.count), 1);

  /* 趋势 badge */
  const Badge = ({ value, positive }: { value: string; positive: boolean }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 12, fontWeight: 600, color: positive ? '#22c55e' : '#ef4444',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {positive
          ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>
          : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>
        }
      </svg>
      {value}
    </span>
  );

  /* 统计卡片图标 */
  const icons = {
    total: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    active: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
    completed: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    health: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  };

  const iconBg = (color: string) => ({ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${color} 10%, var(--bg-card))` } as const);

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg-secondary)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ====== 顶部 4 张统计卡片 ====== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[
            { label: '活动总数', value: total.toLocaleString(), badge: '+12.5%', positive: true, icon: icons.total, iconColor: '#3b82f6' },
            { label: '活跃项目', value: String(active), badge: '+4.2%', positive: true, icon: icons.active, iconColor: '#f59e0b' },
            { label: '已完成', value: completed.toLocaleString(), badge: '+15.0%', positive: true, icon: icons.completed, iconColor: '#22c55e' },
            { label: '健康评分', value: `${healthScore}`, badge: healthScore >= 80 ? '+2.1%' : '-2.1%', positive: healthScore >= 80, icon: icons.health, iconColor: '#6366f1' },
          ].map(({ label, value, badge, positive, icon, iconColor }) => (
            <div key={label} style={{
              background: 'var(--bg-card)', borderRadius: 16, padding: '24px 24px 28px',
              boxShadow: '0 1px 3px rgba(0,0,0,.04)', border: '1px solid var(--border-tertiary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={iconBg(iconColor)}>{icon}</div>
                <Badge value={badge} positive={positive} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {value}{label === '健康评分' && <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-muted)' }}>分</span>}
              </div>
            </div>
          ))}
        </div>

        {/* ====== 第二行：月度营收对比 + 分类分布 ====== */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>

          {/* 月度营收对比 */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: 28,
            boxShadow: '0 1px 3px rgba(0,0,0,.04)', border: '1px solid var(--border-tertiary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>月度营收对比</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>1月 - 6月目标与实际对比</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />实际</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e2e8f0' }} />目标</span>
              </div>
            </div>

            {/* 柱状图 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 200, padding: '20px 0 0' }}>
              {monthlyRev.map((m) => (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', gap: 4, height: 160 }}>
                    <div style={{
                      flex: 1, borderRadius: '6px 6px 0 0',
                      height: `${Math.max(8, (m.actual / maxRev) * 100)}%`,
                      background: '#3b82f6', transition: 'height .4s ease',
                    }} />
                    <div style={{
                      flex: 1, borderRadius: '6px 6px 0 0',
                      height: `${Math.max(8, (m.target / maxRev) * 100)}%`,
                      background: '#e2e8f0', transition: 'height .4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{m.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 分类分布 */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: 28,
            boxShadow: '0 1px 3px rgba(0,0,0,.04)', border: '1px solid var(--border-tertiary)',
          }}>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>分类分布</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>按活动类型统计</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 20 }}>
              {byCat.map(({ label, color, count }) => (
                <div key={label}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${Math.max(6, (count / maxCatCount) * 100)}%`,
                      background: color, transition: 'width .5s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ====== 第三行：Top 5 营收活动 + 节假日日历 ====== */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Top 5 营收活动 */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: 28,
            boxShadow: '0 1px 3px rgba(0,0,0,.04)', border: '1px solid var(--border-tertiary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Top 营收活动</div>
              <button style={{
                fontSize: 13, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none',
                cursor: 'pointer', padding: '4px 8px', borderRadius: 6, transition: 'background .12s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >查看全部</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topRevenue.map((evt, i) => {
                const growthPct = evt.revenueTarget && evt.revenueTarget > 0
                  ? (((evt.revenueActual || 0) - evt.revenueTarget) / evt.revenueTarget * 100).toFixed(1)
                  : null;
                return (
                  <div key={evt.id}
                    onClick={() => openDetailPanel(evt.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16, padding: '14px 4px',
                      cursor: 'pointer', borderRadius: 10, transition: 'background .12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{
                      fontSize: 16, fontWeight: 700, color: 'var(--text-disabled)',
                      width: 28, textAlign: 'center', flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                    }}>{String(i + 1).padStart(2, '0')}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{CAT_SHORT[evt.category] || CATEGORY_NAMES[evt.category]} · {evt.owner || '未分配'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(evt.revenueActual || 0)}</div>
                      {growthPct && (
                        <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: Number(growthPct) >= 0 ? '#22c55e' : '#ef4444' }}>
                          {Number(growthPct) >= 0 ? '+' : ''}{growthPct}%
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {topRevenue.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-placeholder)', fontSize: 14 }}>暂无营收数据</div>
              )}
            </div>
          </div>

          {/* 节假日日历 */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: 28,
            boxShadow: '0 1px 3px rgba(0,0,0,.04)', border: '1px solid var(--border-tertiary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb, #f59e0b 10%, var(--bg-card))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>节假日日历</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Q2 运营重点关注</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {recommendations.map((r) => (
                <div key={r.name} style={{
                  display: 'flex', gap: 16, padding: '16px 18px', borderRadius: 14,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-tertiary)',
                  transition: 'box-shadow .15s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* 日期块 */}
                  <div style={{
                    width: 52, height: 56, borderRadius: 10, background: 'var(--bg-card)',
                    border: '1px solid var(--border-tertiary)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{r.monthLabel}</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>{r.dayLabel}</span>
                  </div>
                  {/* 内容 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</span>
                      {r.hasGap && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: '#1e3a5f', color: '#fff', textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                        }}>推荐行动</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)' }}>{r.suggestions}</div>
                  </div>
                </div>
              ))}
              {recommendations.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-placeholder)', fontSize: 14 }}>近期无重大节假日</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
