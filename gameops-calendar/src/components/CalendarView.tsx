import { useMemo, useState, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday as isTodayFn,
  parseISO, isWithinInterval, startOfDay, endOfDay, eachHourOfInterval,
  differenceInDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '../store/useAppStore.ts';
import type { GameEvent, Holiday } from '../types/index.ts';
import { CATEGORY_COLORS, PRIORITY_CONFIG, CATEGORY_NAMES } from '../constants/index.ts';

const SIM_TODAY = new Date(2026, 2, 26);

export default function CalendarView() {
  const currentDate = useAppStore((s) => s.currentDate);
  const calendarView = useAppStore((s) => s.calendarView);
  const holidays = useAppStore((s) => s.holidays);
  const openDetailPanel = useAppStore((s) => s.openDetailPanel);
  const openEventModal = useAppStore((s) => s.openEventModal);
  const setDefaultStartDate = useAppStore((s) => s.setDefaultStartDate);
  const storeEvents = useAppStore((s) => s.events);
  const filterCategories = useAppStore((s) => s.filterCategories);
  const filterRole = useAppStore((s) => s.filterRole);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const visibleLayers = useAppStore((s) => s.visibleLayers);
  const getFilteredEvents = useAppStore((s) => s.getFilteredEvents);
  const events = useMemo(() => getFilteredEvents(), [storeEvents, filterCategories, filterRole, searchQuery, visibleLayers, getFilteredEvents]);

  // B3: 双击新建 — 通过 store.defaultStartDate 传日期，不传非法对象
  const handleDoubleClickDate = useCallback((day: Date) => {
    setDefaultStartDate(format(day, 'yyyy-MM-dd'));
    openEventModal();
  }, [setDefaultStartDate, openEventModal]);

  if (events.length === 0) {
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

  if (calendarView === 'month') return <MonthView currentDate={currentDate} events={events} holidays={holidays} openDetailPanel={openDetailPanel} onDoubleClick={handleDoubleClickDate} />;
  if (calendarView === 'week') return <WeekView currentDate={currentDate} events={events} holidays={holidays} openDetailPanel={openDetailPanel} onDoubleClick={handleDoubleClickDate} />;
  return <DayView currentDate={currentDate} events={events} holidays={holidays} openDetailPanel={openDetailPanel} />;
}

// B2: eventsForDay 修复 off-by-one — 移除 addDays(-1)
function eventsForDay(events: GameEvent[], day: Date) {
  return events.filter((e) => {
    try {
      return isWithinInterval(day, { start: parseISO(e.startDate), end: parseISO(e.endDate) });
    } catch { return false; }
  });
}
function holidaysForDay(holidays: Holiday[], day: Date) {
  return holidays.filter((h) => { const d = parseISO(h.date); if (h.endDate) return isWithinInterval(day, { start: d, end: parseISO(h.endDate) }); return isSameDay(day, d); });
}
function isToday(day: Date) { return isTodayFn(day) || isSameDay(day, SIM_TODAY); }

// ============ 月视图：跨列色带 + hover tooltip ============

interface EventRow { event: GameEvent; startCol: number; span: number; isStart: boolean; isEnd: boolean; }

function MonthView({ currentDate, events, holidays, openDetailPanel, onDoubleClick }: {
  currentDate: Date; events: GameEvent[]; holidays: Holiday[];
  openDetailPanel: (id: string) => void; onDoubleClick: (day: Date) => void;
}) {
  // I4: tooltip 位置边缘溢出保护
  const [tooltip, setTooltip] = useState<{ x: number; y: number; event: GameEvent } | null>(null);

  const handleTooltipMove = useCallback((e: React.MouseEvent, event: GameEvent) => {
    const vw = window.innerWidth; const vh = window.innerHeight;
    let x = e.clientX + 12; let y = e.clientY - 8;
    if (x + 250 > vw) x = e.clientX - 260;
    if (y + 60 > vh) y = e.clientY - 60;
    setTooltip({ x, y, event });
  }, []);

  const days = useMemo(() => {
    const ms = startOfMonth(currentDate);
    return eachDayOfInterval({ start: startOfWeek(ms, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) });
  }, [currentDate]);

  const weeks = useMemo(() => {
    const w: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7));
    return w;
  }, [days]);

  const weekEventRows = useMemo(() => {
    return weeks.map((weekDays) => {
      const weekStart = weekDays[0]; const weekEnd = weekDays[6];
      const overlapping = events.filter((evt) => {
        try { const es = parseISO(evt.startDate); const ee = parseISO(evt.endDate); return es <= weekEnd && ee >= weekStart; } catch { return false; }
      });
      overlapping.sort((a, b) => {
        const aDur = differenceInDays(parseISO(a.endDate), parseISO(a.startDate));
        const bDur = differenceInDays(parseISO(b.endDate), parseISO(b.startDate));
        if (bDur !== aDur) return bDur - aDur;
        return parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime();
      });
      const rows: (EventRow | null)[][] = [];
      overlapping.forEach((evt) => {
        const es = parseISO(evt.startDate); const ee = parseISO(evt.endDate);
        const startCol = Math.max(0, differenceInDays(es, weekStart));
        const endCol = Math.min(6, differenceInDays(ee, weekStart));
        const span = endCol - startCol + 1;
        const isStart = es >= weekStart; const isEnd = ee <= weekEnd;
        const eventRow: EventRow = { event: evt, startCol, span, isStart, isEnd };
        let placed = false;
        for (let r = 0; r < rows.length; r++) {
          let free = true;
          for (let c = startCol; c <= endCol; c++) { if (rows[r][c] !== null) { free = false; break; } }
          if (free) { for (let c = startCol; c <= endCol; c++) rows[r][c] = c === startCol ? eventRow : { ...eventRow, startCol: c, span: 0 }; placed = true; break; }
        }
        if (!placed) {
          const newRow: (EventRow | null)[] = [null, null, null, null, null, null, null];
          for (let c = startCol; c <= endCol; c++) newRow[c] = c === startCol ? eventRow : { ...eventRow, startCol: c, span: 0 };
          rows.push(newRow);
        }
      });
      return rows;
    });
  }, [weeks, events]);

  const weekDayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const MAX_VISIBLE_ROWS = 3;

  return (
    <div className="flex flex-col h-full relative">
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        {weekDayLabels.map((d) => (
          <div key={d} className="text-center py-3 text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>{d}</div>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        {weeks.map((weekDays, wIdx) => {
          const eventRows = weekEventRows[wIdx];
          const hasMore = eventRows.length > MAX_VISIBLE_ROWS;
          return (
            <div key={wIdx} className="flex-1 grid grid-cols-7 border-b min-h-0 relative" style={{ borderColor: 'var(--border-primary)' }}>
              {weekDays.map((day) => {
                const inMonth = isSameMonth(day, currentDate);
                const td = isToday(day);
                const dh = holidaysForDay(holidays, day);
                return (
                  <div key={day.toISOString()}
                    className="border-r pt-1.5 px-2 flex flex-col transition-colors"
                    style={{ borderColor: 'var(--border-primary)', background: !inMonth ? 'var(--bg-secondary)' : 'transparent' }}
                    onDoubleClick={() => onDoubleClick(day)}
                    role="gridcell" aria-label={format(day, 'yyyy年M月d日', { locale: zhCN })}>
                    <div className="flex items-center gap-1 mb-0.5 flex-shrink-0">
                      <span className={`text-[13px] font-medium w-7 h-7 flex items-center justify-center rounded-full ${td ? 'bg-[#1a73e8] text-white' : ''}`}
                        style={!td ? { color: inMonth ? 'var(--text-secondary)' : 'var(--text-disabled)' } : undefined}>
                        {format(day, 'd')}
                      </span>
                      {dh.slice(0, 1).map((h) => (
                        <span key={h.id} className={`text-[11px] truncate ${h.isImportant ? 'text-[#c5221f] font-medium' : ''}`}
                          style={!h.isImportant ? { color: 'var(--text-placeholder)' } : undefined}>{h.name}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 36 }}>
                {eventRows.slice(0, MAX_VISIBLE_ROWS).map((row, rowIdx) => (
                  <div key={rowIdx} className="relative h-[24px] mb-px">
                    {row.map((cell, colIdx) => {
                      if (!cell || cell.span === 0) return null;
                      const { event, span, isStart, isEnd } = cell;
                      const color = CATEGORY_COLORS[event.category];
                      const leftPct = (colIdx / 7) * 100; const widthPct = (span / 7) * 100;
                      return (
                        <div key={`${event.id}-${colIdx}`}
                          className="absolute top-0 h-full pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity flex items-center overflow-hidden"
                          style={{
                            left: `calc(${leftPct}% + ${isStart ? 4 : 0}px)`,
                            width: `calc(${widthPct}% - ${(isStart ? 4 : 0) + (isEnd ? 4 : 0)}px)`,
                            backgroundColor: `${color}20`, borderLeft: isStart ? `3px solid ${color}` : 'none',
                            borderRadius: `${isStart ? 4 : 0}px ${isEnd ? 4 : 0}px ${isEnd ? 4 : 0}px ${isStart ? 4 : 0}px`,
                          }}
                          onClick={(e) => { e.stopPropagation(); openDetailPanel(event.id); }}
                          onMouseMove={(e) => handleTooltipMove(e, event)}
                          onMouseLeave={() => setTooltip(null)}
                          aria-label={`${event.title} ${event.startDate}~${event.endDate}`}
                          role="button" tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') openDetailPanel(event.id); }}>
                          {isStart && <span className="text-[12px] font-medium truncate px-2" style={{ color: 'var(--text-secondary)' }}>{event.title}</span>}
                        </div>
                      );
                    })}
                  </div>
                ))}
                {hasMore && (
                  <div className="h-[20px] flex">
                    {weekDays.map((day, colIdx) => {
                      const hiddenCount = eventRows.slice(MAX_VISIBLE_ROWS).filter((row) => row[colIdx] && row[colIdx]!.span > 0).length;
                      if (hiddenCount === 0) return <div key={colIdx} className="flex-1" />;
                      return (
                        <div key={colIdx} className="flex-1 flex items-center justify-start pointer-events-auto">
                          <span className="text-[11px] font-medium pl-2 cursor-pointer hover:underline" style={{ color: 'var(--accent)' }}>+{hiddenCount} 更多</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* I4: Tooltip 浮层 — 边缘溢出保护 */}
      {tooltip && (
        <div className="fixed z-[100] pointer-events-none animate-fade-in" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="px-3 py-2 rounded-lg text-[12px] max-w-[240px]"
            style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', boxShadow: 'var(--shadow-md)' }}>
            <div className="font-medium mb-0.5">{tooltip.event.title}</div>
            <div style={{ opacity: 0.7 }}>{tooltip.event.startDate} → {tooltip.event.endDate} · {CATEGORY_NAMES[tooltip.event.category]}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
function WeekView({ currentDate, events, holidays, openDetailPanel, onDoubleClick }: {
  currentDate: Date; events: GameEvent[]; holidays: Holiday[];
  openDetailPanel: (id: string) => void; onDoubleClick: (day: Date) => void;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="grid grid-cols-7 flex-1 min-h-0">
        {days.map((day) => {
          const de = eventsForDay(events, day); const dh = holidaysForDay(holidays, day); const td = isToday(day);
          return (
            <div key={day.toISOString()} className="border-r flex flex-col" style={{ borderColor: 'var(--border-primary)' }}
              onDoubleClick={() => onDoubleClick(day)}>
              <div className="text-center py-4 border-b" style={{ borderColor: 'var(--border-primary)', background: td ? 'var(--accent-bg)' : 'transparent' }}>
                <div className="text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>{format(day, 'EEE', { locale: zhCN })}</div>
                <div className="text-[24px] mt-1" style={{ color: td ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: td ? 500 : 400 }}>{format(day, 'd')}</div>
                {dh.map((h) => (<div key={h.id} className={`text-[11px] mt-0.5 ${h.isImportant ? 'text-[#c5221f]' : ''}`} style={!h.isImportant ? { color: 'var(--text-placeholder)' } : undefined}>{h.name}</div>))}
              </div>
              <div className="flex-1 p-2 space-y-1.5 overflow-auto">
                {de.map((evt) => (
                  <div key={evt.id} onClick={() => openDetailPanel(evt.id)} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') openDetailPanel(evt.id); }}
                    className="p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow border"
                    style={{ borderColor: 'var(--border-primary)', borderLeft: `4px solid ${CATEGORY_COLORS[evt.category]}` }}>
                    <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{evt.title}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="badge text-[10px]" style={{ backgroundColor: `${PRIORITY_CONFIG[evt.priority].color}12`, color: PRIORITY_CONFIG[evt.priority].color }}>{evt.priority}</span>
                      <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{evt.owner}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ 日视图 ============
function DayView({ currentDate, events, holidays, openDetailPanel }: {
  currentDate: Date; events: GameEvent[]; holidays: Holiday[];
  openDetailPanel: (id: string) => void;
}) {
  const de = eventsForDay(events, currentDate);
  const dh = holidaysForDay(holidays, currentDate);
  const hours = eachHourOfInterval({ start: startOfDay(currentDate), end: endOfDay(currentDate) });
  const hourHeight = 64;

  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 border-b px-8 py-5 z-10" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
        <div className="text-[22px]" style={{ color: 'var(--text-secondary)' }}>{format(currentDate, 'yyyy年M月d日 EEEE', { locale: zhCN })}</div>
        <div className="flex items-center gap-3 mt-2">
          {dh.map((h) => (<span key={h.id} className={`badge ${h.isImportant ? 'bg-[#fce8e6] text-[#c5221f]' : ''}`} style={!h.isImportant ? { background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' } : undefined}>{h.name}</span>))}
          <span className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>当日活动 · {de.length}</span>
        </div>
      </div>
      {de.length > 0 && (
        <div className="px-8 py-4 border-b" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-secondary)' }}>
          <div className="text-[12px] font-medium mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>全天活动</div>
          <div className="space-y-2">
            {de.map((evt) => {
              const color = CATEGORY_COLORS[evt.category];
              const dur = differenceInDays(parseISO(evt.endDate), parseISO(evt.startDate)) + 1;
              return (
                <div key={evt.id} onClick={() => openDetailPanel(evt.id)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') openDetailPanel(evt.id); }}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow border"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)', borderLeft: `4px solid ${color}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>{evt.title}</div>
                    <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{evt.startDate} → {evt.endDate} · {dur}天 · {evt.owner}</div>
                  </div>
                  <span className="badge text-[11px]" style={{ backgroundColor: `${color}18`, color }}>{evt.priority}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="relative pl-24">
        {hours.map((hour) => (
          <div key={hour.toISOString()} className="flex border-b" style={{ height: hourHeight, borderColor: 'var(--border-tertiary)' }}>
            <div className="w-24 -ml-24 text-right pr-5 text-[12px] pt-1" style={{ color: 'var(--text-muted)' }}>{format(hour, 'HH:mm')}</div>
            <div className="flex-1 border-l" style={{ borderColor: 'var(--border-primary)' }} />
          </div>
        ))}
        {de.map((evt, idx) => {
          const color = CATEGORY_COLORS[evt.category];
          const startHour = 9 + (idx % 4) * 2; const top = startHour * hourHeight; const height = 2 * hourHeight;
          return (
            <div key={evt.id} className="absolute right-4 cursor-pointer hover:opacity-80 transition-opacity rounded-lg overflow-hidden"
              style={{ top, height, left: `calc(${(idx % 3) * 33}% + 4px)`, width: `calc(${Math.min(33, 100 - (idx % 3) * 33)}% - 8px)`, backgroundColor: `${color}18`, borderLeft: `4px solid ${color}`, minWidth: 120 }}
              onClick={() => openDetailPanel(evt.id)} role="button" tabIndex={0} aria-label={evt.title}
              onKeyDown={(e) => { if (e.key === 'Enter') openDetailPanel(evt.id); }}>
              <div className="p-3">
                <div className="text-[12px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{evt.title}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{evt.owner}</div>
              </div>
            </div>
          );
        })}
        {isToday(currentDate) && (() => {
          const now = new Date(); const ch = now.getHours() + now.getMinutes() / 60;
          return (<div className="absolute left-0 right-0 z-10 flex items-center" style={{ top: ch * hourHeight }}><div className="w-3 h-3 rounded-full bg-[#ea4335] -ml-1.5" /><div className="flex-1 h-[2px] bg-[#ea4335]" /></div>);
        })()}
      </div>
    </div>
  );
}
