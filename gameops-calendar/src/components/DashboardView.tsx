import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore.ts';
import { CATEGORY_COLORS, CATEGORY_NAMES, STATUS_CONFIG, PRIORITY_CONFIG } from '../constants/index.ts';
import type { GameEvent, EventCategory, ScheduleHealth } from '../types/index.ts';
import { parseISO, differenceInDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { TrendingUp, Activity, AlertTriangle, Calendar, Target, Zap, BarChart3, Lightbulb } from 'lucide-react';

export default function DashboardView() {
  const events = useAppStore((s) => s.events);
  const holidays = useAppStore((s) => s.holidays);
  const detectConflicts = useAppStore((s) => s.detectConflicts);
  const openDetailPanel = useAppStore((s) => s.openDetailPanel);

  // === 基础统计 ===
  const stats = useMemo(() => {
    const total = events.length;
    const active = events.filter((e) => !['completed', 'cancelled'].includes(e.status)).length;
    const completed = events.filter((e) => e.status === 'completed').length;
    const totalRevTarget = events.reduce((s, e) => s + (e.revenueTarget || 0), 0);
    const totalRevActual = events.reduce((s, e) => s + (e.revenueActual || 0), 0);
    const completionRate = totalRevTarget > 0 ? (totalRevActual / totalRevTarget * 100) : 0;

    // 按分类统计
    const byCat = (Object.keys(CATEGORY_NAMES) as EventCategory[]).map((cat) => {
      const catEvents = events.filter((e) => e.category === cat);
      return {
        cat, label: CATEGORY_NAMES[cat], color: CATEGORY_COLORS[cat],
        count: catEvents.length,
        revenue: catEvents.reduce((s, e) => s + (e.revenueActual || 0), 0),
        target: catEvents.reduce((s, e) => s + (e.revenueTarget || 0), 0),
      };
    });

    // 按状态统计
    const byStatus = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
      status: key, name: cfg.name, color: cfg.color, count: events.filter((e) => e.status === key).length,
    }));

    // Top 5 营收活动
    const topRevenue = [...events].filter((e) => e.revenueActual).sort((a, b) => (b.revenueActual || 0) - (a.revenueActual || 0)).slice(0, 5);

    return { total, active, completed, totalRevTarget, totalRevActual, completionRate, byCat, byStatus, topRevenue };
  }, [events]);

  // === 排期健康度 ===
  const health = useMemo((): ScheduleHealth => {
    const conflicts = detectConflicts();
    const now = new Date(2026, 2, 26);
    const nextMonth = endOfMonth(startOfMonth(now));
    const upcoming = events.filter((e) => {
      try { const s = parseISO(e.startDate); return s >= now && s <= nextMonth; } catch { return false; }
    });

    // 密度：未来30天有活动的天数占比
    const days30 = eachDayOfInterval({ start: now, end: nextMonth });
    const busyDays = days30.filter((d) => events.some((e) => {
      try { return isWithinInterval(d, { start: parseISO(e.startDate), end: parseISO(e.endDate) }); } catch { return false; }
    }));
    const density = Math.min(100, (busyDays.length / days30.length) * 100);

    // 节奏：活动间距标准差越小越好
    const sortedStarts = events.map((e) => parseISO(e.startDate).getTime()).sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 1; i < sortedStarts.length; i++) gaps.push((sortedStarts[i] - sortedStarts[i - 1]) / 86400000);
    const avgGap = gaps.length > 0 ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 0;
    const stdDev = gaps.length > 0 ? Math.sqrt(gaps.reduce((s, g) => s + (g - avgGap) ** 2, 0) / gaps.length) : 0;
    const rhythm = Math.max(0, Math.min(100, 100 - stdDev * 3));

    // 覆盖度：5大分类中有活动的占比
    const catCoverage = (Object.keys(CATEGORY_NAMES) as EventCategory[]).filter((cat) => events.some((e) => e.category === cat)).length / 5 * 100;

    const conflictPenalty = Math.min(30, conflicts.length * 10);
    const score = Math.round(Math.max(0, Math.min(100, (density * 0.25 + rhythm * 0.3 + catCoverage * 0.25 + (100 - conflictPenalty) * 0.2))));

    const suggestions: string[] = [];
    if (density < 40) suggestions.push('排期密度偏低，建议增加更多活动填充空档期');
    if (density > 85) suggestions.push('排期密度过高，注意避免用户疲劳');
    if (catCoverage < 80) suggestions.push('分类覆盖不全，建议补充缺失的活动类型');
    if (conflicts.length > 0) suggestions.push(`存在 ${conflicts.length} 个排期冲突，建议尽快处理`);
    if (rhythm < 60) suggestions.push('活动节奏不均匀，建议均匀分布活动时间');
    if (upcoming.length === 0) suggestions.push('未来30天无活动计划，建议提前规划');

    return { score, density: Math.round(density), rhythm: Math.round(rhythm), coverage: Math.round(catCoverage), conflicts: conflicts.length, suggestions };
  }, [events, detectConflicts]);

  // === 节假日智能推荐 ===
  const recommendations = useMemo(() => {
    const now = new Date(2026, 2, 26);
    const recs: { holiday: string; date: string; suggestions: string[]; priority: string }[] = [];

    holidays.filter((h) => {
      const d = parseISO(h.date);
      return d > now && differenceInDays(d, now) <= 90 && h.isImportant;
    }).forEach((h) => {
      const existingEvents = events.filter((e) => {
        try {
          const hStart = parseISO(h.date);
          const eStart = parseISO(e.startDate);
          return Math.abs(differenceInDays(eStart, hStart)) <= 7;
        } catch { return false; }
      });

      const suggestions: string[] = [];
      const hasPaid = existingEvents.some((e) => e.category === 'paid');
      const hasEngagement = existingEvents.some((e) => e.category === 'engagement');
      const hasMarketing = existingEvents.some((e) => e.category === 'marketing');

      if (!hasPaid) suggestions.push('💰 限时礼包/折扣活动');
      if (!hasEngagement) suggestions.push('🎯 节日主题挑战活动');
      if (!hasMarketing) suggestions.push('📣 社交媒体推广Campaign');
      if (suggestions.length === 0) suggestions.push('✅ 已有完善的活动安排');

      recs.push({
        holiday: h.name,
        date: format(parseISO(h.date), 'M月d日', { locale: zhCN }),
        suggestions,
        priority: existingEvents.length === 0 ? 'high' : existingEvents.length < 2 ? 'medium' : 'low',
      });
    });
    return recs;
  }, [holidays, events]);

  // === 月度营收热力图数据 ===
  const monthlyRevenue = useMemo(() => {
    const months: { month: string; target: number; actual: number }[] = [];
    for (let m = 0; m < 6; m++) {
      const label = format(new Date(2026, m, 1), 'M月');
      const monthEvents = events.filter((e) => {
        try { const s = parseISO(e.startDate); return s.getMonth() === m && s.getFullYear() === 2026; } catch { return false; }
      });
      months.push({
        month: label,
        target: monthEvents.reduce((s, e) => s + (e.revenueTarget || 0), 0),
        actual: monthEvents.reduce((s, e) => s + (e.revenueActual || 0), 0),
      });
    }
    return months;
  }, [events]);

  const fmtMoney = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString();
  const maxRev = Math.max(...monthlyRevenue.map((m) => Math.max(m.target, m.actual)), 1);

  return (
    <div className="h-full overflow-auto p-6" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* 顶部统计卡片 */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '活动总数', value: stats.total, icon: Calendar, color: 'var(--accent)' },
            { label: '活跃中', value: stats.active, icon: Activity, color: '#22c55e' },
            { label: '已完成', value: stats.completed, icon: Target, color: '#a855f7' },
            { label: '冲突数', value: health.conflicts, icon: AlertTriangle, color: health.conflicts > 0 ? '#ef4444' : '#22c55e' },
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
          {/* 排期健康度仪表盘 */}
          <div className="col-span-1 rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-5">
              <Zap size={18} style={{ color: 'var(--accent)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>排期健康度</span>
            </div>

            {/* 圆环分数 */}
            <div className="flex justify-center mb-5">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" style={{ stroke: 'var(--border-primary)' }} />
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${health.score * 3.27} 327`}
                    style={{ stroke: health.score >= 80 ? '#22c55e' : health.score >= 60 ? '#f59e0b' : '#ef4444' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[32px] font-bold" style={{ color: 'var(--text-primary)' }}>{health.score}</span>
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>/ 100</span>
                </div>
              </div>
            </div>

            {/* 维度条 */}
            <div className="space-y-3">
              {[
                { label: '排期密度', value: health.density, color: '#3b82f6' },
                { label: '节奏合理', value: health.rhythm, color: '#22c55e' },
                { label: '分类覆盖', value: health.coverage, color: '#a855f7' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{value}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-primary)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 月度营收对比 */}
          <div className="col-span-2 rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>月度营收对比</span>
              </div>
              <div className="flex items-center gap-4 text-[12px]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded" style={{ background: 'var(--accent)' }} /> 目标</span>
                <span className="flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}><span className="w-3 h-3 rounded bg-[#22c55e]" /> 实际</span>
              </div>
            </div>
            <div className="flex items-end gap-3 h-[200px]">
              {monthlyRevenue.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-1 h-[170px]">
                    <div className="flex-1 rounded-t-lg transition-all duration-500" style={{ height: `${(m.target / maxRev) * 100}%`, background: 'var(--accent)', opacity: 0.3 }} />
                    <div className="flex-1 rounded-t-lg transition-all duration-500" style={{ height: `${(m.actual / maxRev) * 100}%`, background: '#22c55e' }} />
                  </div>
                  <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{m.month}</span>
                  {m.actual > 0 && <span className="text-[11px] font-medium" style={{ color: '#22c55e' }}>{fmtMoney(m.actual)}</span>}
                </div>
              ))}
            </div>
            {/* 总营收汇总 */}
            <div className="mt-5 pt-4 border-t flex gap-6" style={{ borderColor: 'var(--border-primary)' }}>
              <div>
                <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>总目标</span>
                <div className="text-[20px] font-medium" style={{ color: 'var(--text-primary)' }}>{fmtMoney(stats.totalRevTarget)}</div>
              </div>
              <div>
                <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>总实际</span>
                <div className="text-[20px] font-medium" style={{ color: '#22c55e' }}>{fmtMoney(stats.totalRevActual)}</div>
              </div>
              <div>
                <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>完成率</span>
                <div className="text-[20px] font-medium" style={{ color: stats.completionRate >= 100 ? '#22c55e' : '#f59e0b' }}>{stats.completionRate.toFixed(0)}%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* 分类分布 */}
          <div className="rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>分类分布</span>
            </div>
            <div className="space-y-4">
              {stats.byCat.map(({ label, color, count, revenue, target }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    </div>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{count}</span>
                  </div>
                  {target > 0 && (
                    <div className="ml-5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      营收：{fmtMoney(revenue)} / {fmtMoney(target)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 营收活动 */}
          <div className="rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-5">
              <Target size={18} style={{ color: '#22c55e' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>Top 5 营收活动</span>
            </div>
            <div className="space-y-3">
              {stats.topRevenue.map((evt, idx) => (
                <div key={evt.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer t-bg-hover transition-colors"
                  onClick={() => openDetailPanel(evt.id)}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold"
                    style={{ background: idx === 0 ? '#f59e0b' : idx === 1 ? '#9ca3af' : idx === 2 ? '#cd7f32' : 'var(--bg-tertiary)', color: idx < 3 ? '#fff' : 'var(--text-muted)' }}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{evt.title}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{CATEGORY_NAMES[evt.category]}</div>
                  </div>
                  <span className="text-[14px] font-medium" style={{ color: '#22c55e' }}>{fmtMoney(evt.revenueActual || 0)}</span>
                </div>
              ))}
              {stats.topRevenue.length === 0 && (
                <div className="text-center py-8 text-[13px]" style={{ color: 'var(--text-placeholder)' }}>暂无营收数据</div>
              )}
            </div>
          </div>

          {/* 节假日智能推荐 */}
          <div className="rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-5">
              <Lightbulb size={18} style={{ color: '#f59e0b' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>节假日智能推荐</span>
            </div>
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div key={rec.holiday} className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-tertiary)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{rec.holiday}</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{rec.date}</span>
                  </div>
                  <div className="space-y-1">
                    {rec.suggestions.map((s, i) => (
                      <div key={i} className="text-[12px]" style={{ color: rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : 'var(--text-tertiary)' }}>
                        {s}
                      </div>
                    ))}
                  </div>
                  {rec.priority !== 'low' && (
                    <div className="mt-2">
                      <span className="badge text-[10px]" style={{
                        background: rec.priority === 'high' ? '#fef2f2' : '#fef9c3',
                        color: rec.priority === 'high' ? '#ef4444' : '#ca8a04',
                      }}>{rec.priority === 'high' ? '急需规划' : '建议补充'}</span>
                    </div>
                  )}
                </div>
              ))}
              {recommendations.length === 0 && (
                <div className="text-center py-8 text-[13px]" style={{ color: 'var(--text-placeholder)' }}>未来90天无重要节假日</div>
              )}
            </div>
          </div>
        </div>

        {/* 优化建议 */}
        {health.suggestions.length > 0 && (
          <div className="rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={18} style={{ color: '#f59e0b' }} />
              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>优化建议</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {health.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{i + 1}</span>
                  <span className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
