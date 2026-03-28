import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { format, parseISO, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend, addMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '../store/useAppStore.ts';
import type { GameEvent } from '../types/index.ts';
import { CATEGORY_COLORS, STATUS_CONFIG, PRIORITY_CONFIG } from '../constants/index.ts';

const SIM_TODAY = new Date(2026, 2, 26);

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

  // 拖拽状态
  const [dragInfo, setDragInfo] = useState<{ eventId: string; startX: number; originalStart: string; originalEnd: string } | null>(null);
  // B5: 拖拽视觉偏移
  const [dragOffset, setDragOffset] = useState(0);
  // B6: 记录是否真正拖动过（阈值5px），防止mouseup后误触click
  const didDragRef = useRef(false);

  const timeRange = useMemo(() => {
    const start = startOfMonth(addMonths(currentDate, -1));
    const end = endOfMonth(addMonths(currentDate, 3));
    return { start, end, days: eachDayOfInterval({ start, end }) };
  }, [currentDate]);

  const totalDays = timeRange.days.length;
  const dayWidth = 40;
  const rowHeight = 48;
  const headerHeight = 64;
  const leftPanelWidth = 320;

  const sortedEvents = useMemo(() => {
    const order = ['paid', 'engagement', 'version', 'esports', 'marketing'];
    return [...events].sort((a, b) => { const d = order.indexOf(a.category) - order.indexOf(b.category); return d !== 0 ? d : parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime(); });
  }, [events]);

  const getBarStyle = useCallback((evt: GameEvent) => {
    const s = parseISO(evt.startDate); const e = parseISO(evt.endDate);
    return { left: Math.max(0, differenceInDays(s, timeRange.start) * dayWidth), width: Math.max(dayWidth, (differenceInDays(e, s) + 1) * dayWidth - 4) };
  }, [timeRange.start]);

  const todayOffset = useMemo(() => { const o = differenceInDays(SIM_TODAY, timeRange.start); return o >= 0 && o <= totalDays ? o : -1; }, [timeRange.start, totalDays]);

  const months = useMemo(() => {
    const r: { month: string; count: number }[] = []; let c = ''; let n = 0;
    timeRange.days.forEach((d) => { const m = format(d, 'yyyy年M月', { locale: zhCN }); if (m !== c) { if (c) r.push({ month: c, count: n }); c = m; n = 1; } else n++; });
    if (c) r.push({ month: c, count: n }); return r;
  }, [timeRange.days]);

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

  // B5+B6: 拖拽处理 — 过程只改视觉偏移，mouseup才persist
  const handleMouseDown = useCallback((e: React.MouseEvent, evt: GameEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragInfo({ eventId: evt.id, startX: e.clientX, originalStart: evt.startDate, originalEnd: evt.endDate });
    setDragOffset(0);
    didDragRef.current = false;
  }, []);

  useEffect(() => {
    if (!dragInfo) return;
    const handleMouseMove = (e: MouseEvent) => {
      const offset = e.clientX - dragInfo.startX;
      setDragOffset(offset);
      if (Math.abs(offset) > 5) didDragRef.current = true;
    };
    const handleMouseUp = (e: MouseEvent) => {
      const deltaDays = Math.round((e.clientX - dragInfo.startX) / dayWidth);
      if (deltaDays !== 0) {
        const newStart = addDays(parseISO(dragInfo.originalStart), deltaDays);
        const newEnd = addDays(parseISO(dragInfo.originalEnd), deltaDays);
        moveEvent(dragInfo.eventId, format(newStart, 'yyyy-MM-dd'), format(newEnd, 'yyyy-MM-dd'));
      }
      setDragInfo(null);
      setDragOffset(0);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, [dragInfo, moveEvent]);

  // 依赖箭头计算
  const dependencyLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    const eventIdxMap = new Map<string, number>();
    sortedEvents.forEach((evt, idx) => eventIdxMap.set(evt.id, idx));

    sortedEvents.forEach((evt) => {
      if (!evt.dependencies?.length) return;
      const toIdx = eventIdxMap.get(evt.id);
      if (toIdx === undefined) return;
      const toBar = getBarStyle(evt);

      evt.dependencies.forEach((depId) => {
        const fromIdx = eventIdxMap.get(depId);
        if (fromIdx === undefined) return;
        const fromEvt = sortedEvents[fromIdx];
        const fromBar = getBarStyle(fromEvt);
        lines.push({
          x1: fromBar.left + fromBar.width,
          y1: fromIdx * rowHeight + rowHeight / 2,
          x2: toBar.left,
          y2: toIdx * rowHeight + rowHeight / 2,
          color: CATEGORY_COLORS[evt.category],
        });
      });
    });
    return lines;
  }, [sortedEvents, getBarStyle]);

  // B1: 左右垂直滚动联动
  const handleRightScroll = useCallback(() => {
    if (containerRef.current && leftPanelRef.current) {
      leftPanelRef.current.scrollTop = containerRef.current.scrollTop - headerHeight;
    }
  }, []);

  // 空状态
  if (sortedEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-placeholder)" strokeWidth="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>
          </div>
          <div className="text-[16px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>没有匹配的活动</div>
          <div className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>尝试调整筛选条件，或按 <kbd className="px-1.5 py-0.5 rounded text-[12px] font-mono border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}>N</kbd> 新建活动</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 左侧 */}
      <div className="flex-shrink-0 border-r" style={{ width: leftPanelWidth, background: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
        <div className="border-b" style={{ height: headerHeight, borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center px-6 border-b" style={{ height: 32, borderColor: 'var(--border-primary)' }}>
            <span className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>活动列表</span>
            <span className="text-[13px] ml-2" style={{ color: 'var(--text-tertiary)' }}>({sortedEvents.length})</span>
          </div>
          <div className="flex items-center px-6" style={{ height: 32 }}>
            <button onClick={scrollToToday} className="text-[13px] hover:underline" style={{ color: 'var(--accent)' }}>定位今天</button>
          </div>
        </div>
        <div ref={leftPanelRef} className="overflow-auto" style={{ height: `calc(100% - ${headerHeight}px)` }}>
          {sortedEvents.map((evt) => (
            <div key={evt.id} onClick={() => openDetailPanel(evt.id)}
              className="flex items-center gap-3 px-6 border-b cursor-pointer t-bg-hover transition-colors"
              style={{ height: rowHeight, borderColor: 'var(--border-tertiary)' }}>
              <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[evt.category] }} />
              <span className="text-[14px] truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{evt.title}</span>
              <span className="badge text-[11px]" style={{ backgroundColor: STATUS_CONFIG[evt.status].bg, color: STATUS_CONFIG[evt.status].color }}>
                {STATUS_CONFIG[evt.status].name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 甘特图 — B1: 使用正确的 handleRightScroll */}
      <div className={`flex-1 overflow-auto relative ${dragInfo ? 'cursor-grabbing select-none' : ''}`}
        ref={containerRef} onScroll={handleRightScroll}
        style={{ background: 'var(--bg-surface)' }}>
        <div className="sticky top-0 z-20" style={{ width: totalDays * dayWidth, background: 'var(--bg-surface)' }}>
          <div className="flex border-b" style={{ height: 32, borderColor: 'var(--border-primary)' }}>
            {months.map((m) => (
              <div key={m.month} className="text-[13px] font-medium flex items-center px-4 border-r" style={{ width: m.count * dayWidth, color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' }}>{m.month}</div>
            ))}
          </div>
          <div className="flex border-b" style={{ height: 32, borderColor: 'var(--border-primary)' }}>
            {timeRange.days.map((day) => {
              const td = isSameDay(day, SIM_TODAY); const we = isWeekend(day);
              return (
                <div key={day.toISOString()} className="flex items-center justify-center text-[12px] border-r flex-shrink-0"
                  style={{
                    width: dayWidth,
                    borderColor: 'var(--border-tertiary)',
                    background: td ? 'var(--accent-bg)' : we ? 'var(--bg-secondary)' : 'transparent',
                    color: td ? 'var(--accent)' : we ? 'var(--text-disabled)' : 'var(--text-muted)',
                    fontWeight: td ? 500 : 400,
                  }}>{format(day, 'd')}</div>
              );
            })}
          </div>
        </div>

        <div className="relative" style={{ width: totalDays * dayWidth, minHeight: sortedEvents.length * rowHeight }}>
          {/* 网格 */}
          {timeRange.days.map((day) => {
            const we = isWeekend(day); const offset = differenceInDays(day, timeRange.start) * dayWidth;
            return <div key={day.toISOString()} className="absolute top-0 bottom-0 border-r" style={{ left: offset, width: dayWidth, borderColor: 'var(--border-tertiary)', background: we ? 'var(--bg-secondary)' : 'transparent' }} />;
          })}

          {/* 今天 */}
          {todayOffset >= 0 && (
            <div className="absolute top-0 bottom-0 z-10" style={{ left: todayOffset * dayWidth + dayWidth / 2 }}>
              <div className="w-[2px] h-full" style={{ background: 'var(--accent)' }} />
            </div>
          )}

          {/* 节假日 */}
          {holidays.filter((h) => h.isImportant).map((h) => {
            const hD = parseISO(h.date); const o = differenceInDays(hD, timeRange.start);
            if (o < 0 || o > totalDays) return null;
            return (
              <div key={h.id} className="absolute top-0 bottom-0 bg-[#fce8e6]/30"
                style={{ left: o * dayWidth, width: h.endDate ? (differenceInDays(parseISO(h.endDate), hD) + 1) * dayWidth : dayWidth }}>
                <div className="text-[10px] text-[#c5221f]/50 px-1 pt-1 whitespace-nowrap">{h.name}</div>
              </div>
            );
          })}

          {/* 依赖箭头 */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-[5]" style={{ width: totalDays * dayWidth, height: sortedEvents.length * rowHeight }}>
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="var(--text-placeholder)" />
              </marker>
            </defs>
            {dependencyLines.map((line, i) => {
              const midX = (line.x1 + line.x2) / 2;
              return (
                <path key={i}
                  d={`M${line.x1},${line.y1} C${midX},${line.y1} ${midX},${line.y2} ${line.x2},${line.y2}`}
                  fill="none" stroke="var(--text-placeholder)" strokeWidth="1.5" strokeDasharray="4,3"
                  markerEnd="url(#arrowhead)" opacity={0.7}
                />
              );
            })}
          </svg>

          {/* Bar — B5: 拖拽偏移；B6: click 只在非拖拽时触发 */}
          {sortedEvents.map((evt, idx) => {
            const bar = getBarStyle(evt); const c = CATEGORY_COLORS[evt.category];
            const isDragging = dragInfo?.eventId === evt.id;
            const offsetPx = isDragging ? dragOffset : 0;
            return (
              <div key={evt.id} className="absolute flex items-center" style={{ top: idx * rowHeight + 10, left: bar.left + offsetPx, width: bar.width, height: rowHeight - 20, zIndex: isDragging ? 30 : 1 }}>
                <div
                  onMouseDown={(e) => handleMouseDown(e, evt)}
                  onClick={() => { if (!didDragRef.current) openDetailPanel(evt.id); }}
                  className={`h-full w-full rounded-lg transition-shadow flex items-center px-4 gap-2 overflow-hidden ${isDragging ? 'shadow-lg opacity-80 cursor-grabbing' : 'cursor-grab hover:shadow-md'}`}
                  style={{ backgroundColor: `${c}20`, borderLeft: `4px solid ${c}` }}>
                  <span className="text-[13px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{evt.title}</span>
                  <span className="text-[11px] font-medium flex-shrink-0 ml-auto" style={{ color: PRIORITY_CONFIG[evt.priority].color }}>{evt.priority}</span>
                </div>
              </div>
            );
          })}

          {sortedEvents.map((_, i) => <div key={`l-${i}`} className="absolute left-0 right-0 border-b" style={{ top: (i + 1) * rowHeight, borderColor: 'var(--border-tertiary)' }} />)}
        </div>
      </div>
    </div>
  );
}
