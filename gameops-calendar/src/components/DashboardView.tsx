import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore.ts';
import { CATEGORY_COLORS, CATEGORY_NAMES } from '../constants/index.ts';
import type { EventCategory } from '../types/index.ts';
import { Calendar, Activity, Target, AlertTriangle, Zap, BarChart3, Lightbulb, TrendingUp } from 'lucide-react';

export default function DashboardView() {
  const events = useAppStore((s) => s.events);
  const holidays = useAppStore((s) => s.holidays);
  const openDetailPanel = useAppStore((s) => s.openDetailPanel);

  // 基础统计
  const total = events.length;
  const active = events.filter((e) => !['completed', 'cancelled'].includes(e.status)).length;
  const completed = events.filter((e) => e.status === 'completed').length;
  const totalRevTarget = events.reduce((s, e) => s + (e.revenueTarget || 0), 0);
  const totalRevActual = events.reduce((s, e) => s + (e.revenueActual || 0), 0);
  const completionRate = totalRevTarget > 0 ? Math.round(totalRevActual / totalRevTarget * 100) : 0;

  // 分类统计
  const byCat = useMemo(() => (Object.keys(CATEGORY_NAMES) as EventCategory[]).map((cat) => {
    const ce = events.filter((e) => e.category === cat);
    return { cat, label: CATEGORY_NAMES[cat], color: CATEGORY_COLORS[cat], count: ce.length, rev: ce.reduce((s, e) => s + (e.revenueActual || 0), 0), target: ce.reduce((s, e) => s + (e.revenueTarget || 0), 0) };
  }), [events]);

  // Top 5 营收
  const topRevenue = useMemo(() =>
    [...events].filter((e) => e.revenueActual && e.revenueActual > 0).sort((a, b) => (b.revenueActual || 0) - (a.revenueActual || 0)).slice(0, 5)
  , [events]);

  // 月度营收
  const monthlyRev = useMemo(() => {
    const ms: { month: string; target: number; actual: number }[] = [];
    for (let m = 0; m < 6; m++) {
      const me = events.filter((e) => { try { const d = new Date(e.startDate); return d.getMonth() === m && d.getFullYear() === 2026; } catch { return false; } });
      ms.push({ month: `${m + 1}月`, target: me.reduce((s, e) => s + (e.revenueTarget || 0), 0), actual: me.reduce((s, e) => s + (e.revenueActual || 0), 0) });
    }
    return ms;
  }, [events]);

  // 节假日推荐
  const recommendations = useMemo(() => {
    const now = new Date(2026, 2, 26);
    return holidays.filter((h) => {
      try { const d = new Date(h.date); return d > now && (d.getTime() - now.getTime()) / 86400000 <= 90 && h.isImportant; } catch { return false; }
    }).map((h) => {
      const hd = new Date(h.date);
      const nearby = events.filter((e) => { try { return Math.abs((new Date(e.startDate).getTime() - hd.getTime()) / 86400000) <= 7; } catch { return false; } });
      const sug: string[] = [];
      if (!nearby.some((e) => e.category === 'paid')) sug.push('💰 限时礼包/折扣活动');
      if (!nearby.some((e) => e.category === 'engagement')) sug.push('🎯 节日主题挑战活动');
      if (!nearby.some((e) => e.category === 'marketing')) sug.push('📣 社交媒体推广Campaign');
      if (sug.length === 0) sug.push('✅ 已有完善的活动安排');
      return { name: h.name, date: `${hd.getMonth() + 1}月${hd.getDate()}日`, suggestions: sug, urgent: nearby.length === 0 };
    });
  }, [holidays, events]);

  // 健康度（简化版）
  const healthScore = useMemo(() => {
    const catCount = (Object.keys(CATEGORY_NAMES) as EventCategory[]).filter((c) => events.some((e) => e.category === c)).length;
    const coverage = catCount / 5 * 100;
    const hasConflict = events.length > 15 ? 10 : 0;
    return Math.round(Math.min(100, Math.max(0, coverage * 0.5 + 50 - hasConflict)));
  }, [events]);

  const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString();
  const maxRev = Math.max(...monthlyRev.map((m) => Math.max(m.target, m.actual)), 1);

  return (
    <div className="h-full overflow-auto p-6" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* 顶部统计 */}
        <div className="grid grid-cols-4 gap-5">
          {[
            { label: '活动总数', value: total, icon: Calendar, color: 'var(--accent)' },
            { label: '活跃中', value: active, icon: Activity, color: '#22c55e' },
            { label: '已完成', value: completed, icon: Target, color: '#a855f7' },
            { label: '健康度', value: `${healthScore}分`, icon: Zap, color: healthScore >= 80 ? '#22c55e' : '#f59e0b' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl p-5 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                <Icon size={20} style={{ color }} />
              </div>
              <div className="text-[28px] font-medium" style={{ color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* 月度营收 */}
          <div className="col-span-2 rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>月度营收对比</span>
              </div>
              <div className="flex items-center gap-4 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: 'var(--accent)', opacity: 0.3 }} />目标</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#22c55e]" />实际</span>
              </div>
            </div>
            <div className="flex items-end gap-3 h-[200px]">
              {monthlyRev.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-1 h-[170px]">
                    <div className="flex-1 rounded-t-lg" style={{ height: `${Math.max(4, (m.target / maxRev) * 100)}%`, background: 'var(--accent)', opacity: 0.3 }} />
                    <div className="flex-1 rounded-t-lg" style={{ height: `${Math.max(4, (m.actual / maxRev) * 100)}%`, background: '#22c55e' }} />
                  </div>
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{m.month}</span>
                  {m.actual > 0 && <span className="text-[11px] font-medium" style={{ color: '#22c55e' }}>{fmt(m.actual)}</span>}
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t flex gap-6" style={{ borderColor: 'var(--border-primary)' }}>
              <div><div className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>总目标</div><div className="text-[20px] font-medium" style={{ color: 'var(--text-primary)' }}>{fmt(totalRevTarget)}</div></div>
              <div><div className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>总实际</div><div className="text-[20px] font-medium" style={{ color: '#22c55e' }}>{fmt(totalRevActual)}</div></div>
              <div><div className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>完成率</div><div className="text-[20px] font-medium" style={{ color: completionRate >= 100 ? '#22c55e' : '#f59e0b' }}>{completionRate}%</div></div>
            </div>
          </div>

          {/* 分类分布 */}
          <div className="rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>分类分布</span>
            </div>
            <div className="space-y-4">
              {byCat.map(({ label, color, count, rev, target }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{count}</span>
                  </div>
                  {target > 0 && <div className="ml-5 text-[11px]" style={{ color: 'var(--text-muted)' }}>营收：{fmt(rev)} / {fmt(target)}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Top5 */}
          <div className="rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-5">
              <Target size={18} style={{ color: '#22c55e' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>Top 5 营收活动</span>
            </div>
            <div className="space-y-3">
              {topRevenue.map((evt, i) => (
                <div key={evt.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer t-bg-hover" onClick={() => openDetailPanel(evt.id)}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold"
                    style={{ background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7f32' : 'var(--bg-tertiary)', color: i < 3 ? '#fff' : 'var(--text-muted)' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{evt.title}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{CATEGORY_NAMES[evt.category]}</div>
                  </div>
                  <span className="text-[14px] font-medium" style={{ color: '#22c55e' }}>{fmt(evt.revenueActual || 0)}</span>
                </div>
              ))}
              {topRevenue.length === 0 && <div className="text-center py-8 text-[13px]" style={{ color: 'var(--text-placeholder)' }}>暂无营收数据</div>}
            </div>
          </div>

          {/* 节假日推荐 */}
          <div className="rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-5">
              <Lightbulb size={18} style={{ color: '#f59e0b' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>节假日智能推荐</span>
            </div>
            <div className="space-y-4">
              {recommendations.map((r) => (
                <div key={r.name} className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-tertiary)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{r.name}</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{r.date}</span>
                  </div>
                  {r.suggestions.map((s, i) => (
                    <div key={i} className="text-[12px]" style={{ color: r.urgent ? '#ef4444' : 'var(--text-tertiary)' }}>{s}</div>
                  ))}
                  {r.urgent && <span className="badge text-[10px] mt-2" style={{ background: '#fef2f2', color: '#ef4444' }}>急需规划</span>}
                </div>
              ))}
              {recommendations.length === 0 && <div className="text-center py-8 text-[13px]" style={{ color: 'var(--text-placeholder)' }}>暂无推荐</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
