import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { format, parseISO, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend, addMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '../store/useAppStore.ts';
import type { GameEvent } from '../types/index.ts';
import { CATEGORY_COLORS, STATUS_CONFIG, PRIORITY_CONFIG } from '../constants/index.ts';

const SIM_TODAY = new Date(2026, 2, 26);
const DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function GanttView() {
  const currentDate = useAppStore((s) => s.currentDate);
  const holidays = useAppStore((s) => s.holidays);
  const openDetailPanel = useAppStore((s) => s.openDetailPanel);
  const moveEvent = useAppStore((s) => s.moveEvent);
  const storeEvents = useAppStore((s) => s.events);
  const filterCategories = useAppStore((s) => s.filterCategories);
  const filterRole = useAppStore((s) => s.filterRole);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const visibleLayers = useAppStore((s) => s.visibleLayers);
  const getFilteredEvents = useAppStore((s) => s.getFilteredEvents);
  const events = useMemo(() => getFilteredEvents(), [storeEvents, filterCategories, filterRole, searchQuery, visibleLayers, getFilteredEvents]);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const [dragInfo, setDragInfo] = useState<{ eventId: string; startX: number; originalStart: string; originalEnd: string } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const didDragRef = useRef(false);

  const timeRange = useMemo(() => {
    const start = startOfMonth(addMonths(currentDate, -1));
    const end = endOfMonth(addMonths(currentDate, 3));
    return { start, end, days: eachDayOfInterval({ start, end }) };
  }, [currentDate]);

  const dayWidth = 38;
  const rowHeight = 54;
  const headerHeight = 72;
  const leftPanelWidth = 340;
  const totalDays = timeRange.days.length;

  const sortedEvents = useMemo(() => {
    const order = ['paid', 'engagement', 'version', 'esports', 'marketing'];
    return [...events].sort((a, b) => { const d = order.indexOf(a.category) - order.indexOf(b.category); return d !== 0 ? d : parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime(); });
  }, [events]);

  const getBarStyle = useCallback((evt: GameEvent) => {
    const s = parseISO(evt.startDate); const e = parseISO(evt.endDate);
    return { left: Math.max(0, differenceInDays(s, timeRange.start) * dayWidth), width: Math.max(dayWidth, (differenceInDays(e, s) + 1) * dayWidth - 4) };
  }, [timeRange.start]);

  const todayOffset = useMemo(() => { const o = differenceInDays(SIM_TODAY, timeRange.start); return o >= 0 && o <= totalDays ? o : -1; }, [timeRange.start, totalDays]);

  const scrollToToday = useCallback(() => {
    if (containerRef.current && todayOffset >= 0) {
      containerRef.current.scrollLeft = todayOffset * dayWidth - containerRef.current.clientWidth / 2;
    }
  }, [todayOffset]);

  useEffect(() => {
    if (!hasScrolledRef.current && containerRef.current && todayOffset >= 0) {
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollLeft = todayOffset * dayWidth - containerRef.current.clientWidth / 2;
          hasScrolledRef.current = true;
        }
      });
    }
  }, [todayOffset]);

  const handleMouseDown = useCallback((e: React.MouseEvent, evt: GameEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragInfo({ eventId: evt.id, startX: e.clientX, originalStart: evt.startDate, originalEnd: evt.endDate });
    setDragOffset(0); didDragRef.current = false;
  }, []);

  useEffect(() => {
    if (!dragInfo) return;
    const onMove = (e: MouseEvent) => { const o = e.clientX - dragInfo.startX; setDragOffset(o); if (Math.abs(o) > 5) didDragRef.current = true; };
    const onUp = (e: MouseEvent) => {
      const d = Math.round((e.clientX - dragInfo.startX) / dayWidth);
      if (d !== 0) moveEvent(dragInfo.eventId, format(addDays(parseISO(dragInfo.originalStart), d), 'yyyy-MM-dd'), format(addDays(parseISO(dragInfo.originalEnd), d), 'yyyy-MM-dd'));
      setDragInfo(null); setDragOffset(0);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [dragInfo, moveEvent]);

  const dependencyLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    const idxMap = new Map<string, number>();
    sortedEvents.forEach((evt, i) => idxMap.set(evt.id, i));
    sortedEvents.forEach((evt) => {
      if (!evt.dependencies?.length) return;
      const toIdx = idxMap.get(evt.id); if (toIdx === undefined) return;
      const toBar = getBarStyle(evt);
      evt.dependencies.forEach((depId) => {
        const fromIdx = idxMap.get(depId); if (fromIdx === undefined) return;
        const fromBar = getBarStyle(sortedEvents[fromIdx]);
        lines.push({ x1: fromBar.left + fromBar.width, y1: fromIdx * rowHeight + rowHeight / 2, x2: toBar.left, y2: toIdx * rowHeight + rowHeight / 2, color: CATEGORY_COLORS[evt.category] });
      });
    });
    return lines;
  }, [sortedEvents, getBarStyle]);

  const handleRightScroll = useCallback(() => {
    if (containerRef.current && leftPanelRef.current) leftPanelRef.current.scrollTop = containerRef.current.scrollTop - headerHeight;
  }, []);

  if (sortedEvents.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ width: 80, height: 80, margin: '0 auto 24px', borderRadius: 16, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-placeholder)" strokeWidth="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 12, color: 'var(--text-secondary)' }}>没有匹配的活动</div>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-tertiary)' }}>尝试调整筛选条件，或按 N 新建活动</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-primary)' }}>
      {/* ====== 左侧面板 ====== */}
      <div style={{ width: leftPanelWidth, flexShrink: 0, borderRight: '1px solid var(--border-tertiary)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' }}>
        {/* 左侧 Header */}
        <div style={{ height: headerHeight, borderBottom: '1px solid var(--border-tertiary)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 4 }}>ACTIVE TASKS</div>
          <button onClick={scrollToToday} style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>定位今天</button>
        </div>

        {/* 左侧列表 */}
        <div ref={leftPanelRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {sortedEvents.map((evt) => {
            const catColor = CATEGORY_COLORS[evt.category];
            const stCfg = STATUS_CONFIG[evt.status];
            return (
              <div key={evt.id} onClick={() => openDetailPanel(evt.id)}
                className="t-bg-hover"
                style={{ height: rowHeight, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', borderBottom: '1px solid var(--border-tertiary)', cursor: 'pointer', transition: 'background .12s' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{evt.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: stCfg.bg, color: stCfg.color }}>{stCfg.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-placeholder)' }}>Due {format(parseISO(evt.endDate), 'MMM d')}</span>
                  </div>
                </div>
                {/* 颜色圆点 */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ====== 甘特图主区域 ====== */}
      <div ref={containerRef} onScroll={handleRightScroll}
        style={{ flex: 1, overflow: 'auto', position: 'relative', cursor: dragInfo ? 'grabbing' : 'default', userSelect: dragInfo ? 'none' : 'auto' }}>

        {/* Header: 星期缩写 + 日期 */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20, width: totalDays * dayWidth, background: 'var(--bg-surface)' }}>
          {/* 第一行：星期缩写 */}
          <div style={{ display: 'flex', height: 36, borderBottom: '1px solid var(--border-tertiary)' }}>
            {timeRange.days.map((day) => {
              const td = isSameDay(day, SIM_TODAY);
              const dayOfWeek = day.getDay(); // 0=Sun
              const dayLabel = DAY_NAMES[dayOfWeek === 0 ? 6 : dayOfWeek - 1];
              return (
                <div key={`w-${day.toISOString()}`} style={{
                  width: dayWidth, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 500, color: td ? 'var(--accent)' : 'var(--text-placeholder)',
                  borderRight: '1px solid var(--border-tertiary)',
                }}>{dayLabel}</div>
              );
            })}
          </div>
          {/* 第二行：日期数字 */}
          <div style={{ display: 'flex', height: 36, borderBottom: '1px solid var(--border-tertiary)' }}>
            {timeRange.days.map((day) => {
              const td = isSameDay(day, SIM_TODAY);
              const we = isWeekend(day);
              return (
                <div key={`d-${day.toISOString()}`} style={{
                  width: dayWidth, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: td ? 700 : 400,
                  color: td ? '#fff' : we ? 'var(--text-disabled)' : 'var(--text-muted)',
                  background: td ? 'var(--accent)' : 'transparent',
                  borderRight: '1px solid var(--border-tertiary)',
                  borderRadius: td ? 8 : 0,
                }}>{format(day, 'd')}</div>
              );
            })}
          </div>
        </div>

        {/* 甘特条区域 */}
        <div style={{ position: 'relative', width: totalDays * dayWidth, minHeight: sortedEvents.length * rowHeight }}>
          {/* 网格列 + 今天高亮 */}
          {timeRange.days.map((day) => {
            const we = isWeekend(day);
            const td = isSameDay(day, SIM_TODAY);
            const offset = differenceInDays(day, timeRange.start) * dayWidth;
            return (
              <div key={`g-${day.toISOString()}`} style={{
                position: 'absolute', top: 0, bottom: 0, left: offset, width: dayWidth,
                borderRight: '1px solid var(--border-tertiary)',
                background: td ? 'rgba(0,113,227,0.06)' : we ? 'var(--bg-secondary)' : 'transparent',
              }} />
            );
          })}

          {/* 节假日 */}
          {holidays.filter((h) => h.isImportant).map((h) => {
            const hD = parseISO(h.date); const o = differenceInDays(hD, timeRange.start);
            if (o < 0 || o > totalDays) return null;
            return (
              <div key={h.id} style={{ position: 'absolute', top: 0, bottom: 0, left: o * dayWidth, width: h.endDate ? (differenceInDays(parseISO(h.endDate), hD) + 1) * dayWidth : dayWidth, background: 'rgba(255,59,48,0.04)' }}>
                <span style={{ fontSize: 10, fontWeight: 500, padding: '6px 4px', whiteSpace: 'nowrap', color: 'rgba(255,59,48,0.4)' }}>{h.name}</span>
              </div>
            );
          })}

          {/* 依赖箭头 — 虚线 */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: totalDays * dayWidth, height: sortedEvents.length * rowHeight, pointerEvents: 'none', zIndex: 5 }}>
            <defs>
              <marker id="ah" markerWidth="6" markerHeight="5" refX="6" refY="2.5" orient="auto">
                <polygon points="0 0, 6 2.5, 0 5" fill="var(--text-placeholder)" />
              </marker>
            </defs>
            {dependencyLines.map((l, i) => {
              const midX = (l.x1 + l.x2) / 2;
              return (
                <path key={i}
                  d={`M${l.x1},${l.y1} C${midX},${l.y1} ${midX},${l.y2} ${l.x2},${l.y2}`}
                  fill="none" stroke="var(--text-placeholder)" strokeWidth="1.5" strokeDasharray="5,4"
                  markerEnd="url(#ah)" opacity={0.5} />
              );
            })}
          </svg>

          {/* 甘特条 */}
          {sortedEvents.map((evt, idx) => {
            const bar = getBarStyle(evt);
            const c = CATEGORY_COLORS[evt.category];
            const isDragging = dragInfo?.eventId === evt.id;
            const offPx = isDragging ? dragOffset : 0;
            return (
              <div key={evt.id} style={{
                position: 'absolute',
                top: idx * rowHeight + 10,
                left: bar.left + offPx,
                width: bar.width,
                height: rowHeight - 20,
                zIndex: isDragging ? 30 : 2,
              }}>
                <div
                  onMouseDown={(e) => handleMouseDown(e, evt)}
                  onClick={() => { if (!didDragRef.current) openDetailPanel(evt.id); }}
                  style={{
                    height: '100%', width: '100%',
                    borderRadius: 8,
                    background: `${c}15`,
                    borderLeft: `3px solid ${c}`,
                    display: 'flex', alignItems: 'center',
                    padding: '0 12px',
                    overflow: 'hidden',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    opacity: isDragging ? 0.75 : 1,
                    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,.15)' : 'none',
                    transition: isDragging ? 'none' : 'box-shadow .15s',
                  }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.title}</span>
                </div>
              </div>
            );
          })}

          {/* 行分隔线 */}
          {sortedEvents.map((_, i) => (
            <div key={`sep-${i}`} style={{ position: 'absolute', left: 0, right: 0, top: (i + 1) * rowHeight, height: 1, background: 'var(--border-tertiary)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
