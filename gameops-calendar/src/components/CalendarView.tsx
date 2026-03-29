import { useMemo, useState, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday as isTodayFn,
  parseISO, isWithinInterval, startOfDay, endOfDay, eachHourOfInterval,
  differenceInDays, addDays,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAppStore } from '../store/useAppStore.ts';
import type { GameEvent, Holiday, EventCategory } from '../types/index.ts';
import { CATEGORY_COLORS, PRIORITY_CONFIG, CATEGORY_NAMES } from '../constants/index.ts';

const SIM_TODAY = new Date(2026, 2, 26);

export default function CalendarView() {
  const currentDate = useAppStore((s) => s.currentDate);
  const calendarView = useAppStore((s) => s.calendarView);
  const holidays = useAppStore((s) => s.holidays);
  const openDetailPanel = useAppStore((s) => s.openDetailPanel);
  const openEventModal = useAppStore((s) => s.openEventModal);
  const setDefaultStartDate = useAppStore((s) => s.setDefaultStartDate);
  const moveEvent = useAppStore((s) => s.moveEvent);
  const storeEvents = useAppStore((s) => s.events);
  const filterCategories = useAppStore((s) => s.filterCategories);
  const filterRole = useAppStore((s) => s.filterRole);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const visibleLayers = useAppStore((s) => s.visibleLayers);
  const getFilteredEvents = useAppStore((s) => s.getFilteredEvents);
  const events = useMemo(() => getFilteredEvents(), [storeEvents, filterCategories, filterRole, searchQuery, visibleLayers, getFilteredEvents]);

  const handleDoubleClickDate = useCallback((day: Date) => {
    setDefaultStartDate(format(day, 'yyyy-MM-dd'));
    openEventModal();
  }, [setDefaultStartDate, openEventModal]);

  if (calendarView === 'month') return <MonthView currentDate={currentDate} events={events} allEvents={storeEvents} holidays={holidays} openDetailPanel={openDetailPanel} onDoubleClick={handleDoubleClickDate} moveEvent={moveEvent} />;
  if (calendarView === 'week') return <WeekView currentDate={currentDate} events={events} holidays={holidays} openDetailPanel={openDetailPanel} onDoubleClick={handleDoubleClickDate} />;
  return <DayView currentDate={currentDate} events={events} holidays={holidays} openDetailPanel={openDetailPanel} onDoubleClick={handleDoubleClickDate} />;
}

function eventsForDay(events: GameEvent[], day: Date) {
  return events.filter((e) => { try { return isWithinInterval(day, { start: parseISO(e.startDate), end: parseISO(e.endDate) }); } catch { return false; } });
}
function holidaysForDay(holidays: Holiday[], day: Date) {
  return holidays.filter((h) => { const d = parseISO(h.date); if (h.endDate) return isWithinInterval(day, { start: d, end: parseISO(h.endDate) }); return isSameDay(day, d); });
}
function isToday(day: Date) { return isTodayFn(day) || isSameDay(day, SIM_TODAY); }

/* ============ 月视图 — 完全对齐截图 ============ */

interface EventRow { event: GameEvent; startCol: number; span: number; isStart: boolean; isEnd: boolean; }

/* 简化分类名（中文） */
const SHORT_CAT: Record<string, string> = {
  paid: '付费活动', engagement: '促活活动', version: '版本更新',
  esports: '电竞赛事', marketing: '市场推广',
};

function MonthView({ currentDate, events, allEvents, holidays, openDetailPanel, onDoubleClick, moveEvent }: {
  currentDate: Date; events: GameEvent[]; allEvents: GameEvent[]; holidays: Holiday[];
  openDetailPanel: (id: string) => void; onDoubleClick: (day: Date) => void;
  moveEvent: (id: string, s: string, e: string) => void;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; event: GameEvent } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const setFilterCategories = useAppStore((s) => s.setFilterCategories);
  const filterCategories = useAppStore((s) => s.filterCategories);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const handleTooltipMove = useCallback((e: React.MouseEvent, event: GameEvent) => {
    let x = e.clientX + 16; let y = e.clientY - 12;
    if (x + 280 > window.innerWidth) x = e.clientX - 290;
    if (y + 80 > window.innerHeight) y = e.clientY - 80;
    setTooltip({ x, y, event });
  }, []);

  /* weekStartsOn: 0 = Sunday（对齐截图） */
  const days = useMemo(() => {
    const ms = startOfMonth(currentDate);
    return eachDayOfInterval({ start: startOfWeek(ms, { weekStartsOn: 0 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }) });
  }, [currentDate]);
  const weeks = useMemo(() => { const w: Date[][] = []; for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7)); return w; }, [days]);

  const weekEventRows = useMemo(() => {
    return weeks.map((wd) => {
      const ws = wd[0]; const we = wd[6];
      const ol = events.filter((evt) => { try { const es = parseISO(evt.startDate); const ee = parseISO(evt.endDate); return es <= we && ee >= ws; } catch { return false; } });
      ol.sort((a, b) => { const ad = differenceInDays(parseISO(a.endDate), parseISO(a.startDate)); const bd = differenceInDays(parseISO(b.endDate), parseISO(b.startDate)); return bd !== ad ? bd - ad : parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime(); });
      const rows: (EventRow | null)[][] = [];
      ol.forEach((evt) => {
        const es = parseISO(evt.startDate); const ee = parseISO(evt.endDate);
        const sc = Math.max(0, differenceInDays(es, ws)); const ec = Math.min(6, differenceInDays(ee, ws));
        const sp = ec - sc + 1; const iS = es >= ws; const iE = ee <= we;
        const er: EventRow = { event: evt, startCol: sc, span: sp, isStart: iS, isEnd: iE };
        let placed = false;
        for (let r = 0; r < rows.length; r++) { let free = true; for (let c = sc; c <= ec; c++) { if (rows[r][c]) { free = false; break; } } if (free) { for (let c = sc; c <= ec; c++) rows[r][c] = c === sc ? er : { ...er, startCol: c, span: 0 }; placed = true; break; } }
        if (!placed) { const nr: (EventRow | null)[] = Array(7).fill(null); for (let c = sc; c <= ec; c++) nr[c] = c === sc ? er : { ...er, startCol: c, span: 0 }; rows.push(nr); }
      });
      return rows;
    });
  }, [weeks, events]);

  /* 星期标签 */
  const labels = ['日', '一', '二', '三', '四', '五', '六'];
  const MAX_ROWS = 3;

  /* Upcoming Deadlines（取最近结束的3个活跃活动） */
  const upcoming = useMemo(() => {
    const today = format(SIM_TODAY, 'yyyy-MM-dd');
    return allEvents
      .filter((e) => e.endDate >= today && !['completed', 'cancelled'].includes(e.status))
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
      .slice(0, 2);
  }, [allEvents]);

  /* Event Filters 分类列表 */
  const categories = useMemo(() =>
    (Object.keys(CATEGORY_COLORS) as EventCategory[]).map((cat) => ({
      cat, label: SHORT_CAT[cat] || CATEGORY_NAMES[cat], color: CATEGORY_COLORS[cat],
    })), []);

  /* 切换分类 */
  const toggleCat = (cat: EventCategory) => {
    setFilterCategories(filterCategories.includes(cat) ? filterCategories.filter((c) => c !== cat) : [...filterCategories, cat]);
  };

  /* 距离今天的天数文字 */
  const daysUntil = (dateStr: string) => {
    const d = differenceInDays(parseISO(dateStr), SIM_TODAY);
    if (d === 0) return '今天';
    if (d === 1) return '明天';
    return `${d}天后`;
  };

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-primary)', position: 'relative' }}>

      {/* ====== 左侧：日历主体 ====== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>

        {/* 星期头（英文大写，对齐截图） */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-tertiary)', flexShrink: 0 }}>
          {labels.map((d) => (
            <div key={d} style={{
              height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
              color: 'var(--text-muted)', textTransform: 'uppercase' as const,
            }}>{d}</div>
          ))}
        </div>

        {/* 日期网格 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {weeks.map((wd, wIdx) => {
            const er = weekEventRows[wIdx];
            const hasMore = er.length > MAX_ROWS;
            return (
              <div key={wIdx} style={{
                flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                borderBottom: '1px solid var(--border-tertiary)',
                position: 'relative', minHeight: 0,
              }}>
                {wd.map((day) => {
                  const inMonth = isSameMonth(day, currentDate);
                  const td = isToday(day);
                  const dh = holidaysForDay(holidays, day);
                  const isDragOver = dragOverDay === day.toISOString();
                  return (
                    <div key={day.toISOString()}
                      style={{
                        borderRight: '1px solid var(--border-tertiary)',
                        padding: '8px 10px', display: 'flex', flexDirection: 'column',
                        transition: 'background .12s',
                        background: isDragOver
                          ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                          : !inMonth ? 'var(--bg-secondary)' : 'transparent',
                      }}
                      onDoubleClick={() => onDoubleClick(day)}
                      onDragOver={(e) => e.preventDefault()}
                      onDragEnter={(e) => { e.preventDefault(); setDragOverDay(day.toISOString()); }}
                      onDragLeave={() => setDragOverDay(null)}
                      onDrop={(e) => {
                        e.preventDefault(); setDragOverDay(null);
                        try {
                          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                          if (data.eventId) {
                            const ev = events.find((x) => x.id === data.eventId);
                            if (ev) {
                              const dur = differenceInDays(parseISO(ev.endDate), parseISO(ev.startDate));
                              moveEvent(data.eventId, format(day, 'yyyy-MM-dd'), format(addDays(day, dur), 'yyyy-MM-dd'));
                            }
                          }
                        } catch { /* */ }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 13, fontWeight: td ? 700 : 500,
                          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '50%',
                          background: td ? '#3b82f6' : 'transparent',
                          color: td ? '#fff' : inMonth ? 'var(--text-primary)' : 'var(--text-disabled)',
                        }}>{format(day, 'd')}</span>
                        {dh.slice(0, 1).map((h) => (
                          <span key={h.id} style={{
                            fontSize: 10, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            color: h.isImportant ? '#ff3b30' : 'var(--text-placeholder)',
                          }}>{h.name}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* 色带（饱和纯色背景 + 白色文字，对齐截图） */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: 44, pointerEvents: 'none', zIndex: 1 }}>
                  {er.slice(0, MAX_ROWS).map((row, ri) => (
                    <div key={ri} style={{ position: 'relative', height: 22, marginBottom: 3 }}>
                      {row.map((cell, ci) => {
                        if (!cell || cell.span === 0) return null;
                        const { event, span, isStart, isEnd } = cell;
                        const c = CATEGORY_COLORS[event.category];
                        const lp = (ci / 7) * 100; const wp = (span / 7) * 100;
                        return (
                          <div key={`${event.id}-${ci}`}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({ eventId: event.id }));
                              e.currentTarget.style.opacity = '0.5';
                            }}
                            onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; }}
                            style={{
                              position: 'absolute', top: 0, height: '100%',
                              pointerEvents: 'auto', cursor: 'grab',
                              left: `calc(${lp}% + ${isStart ? 6 : 0}px)`,
                              width: `calc(${wp}% - ${(isStart ? 6 : 0) + (isEnd ? 6 : 0)}px)`,
                              background: c,
                              borderRadius: 4,
                              display: 'flex', alignItems: 'center', overflow: 'hidden',
                              transition: 'filter .12s, opacity .15s',
                            }}
                            onClick={(e) => { e.stopPropagation(); openDetailPanel(event.id); }}
                            onMouseMove={(e) => handleTooltipMove(e, event)}
                            onMouseLeave={() => setTooltip(null)}
                            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
                            onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                          >
                            {isStart && (
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: '0 8px',
                                color: '#fff',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>{event.title}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {hasMore && (
                    <div style={{ height: 18, display: 'flex' }}>
                      {wd.map((_, ci) => {
                        const hc = er.slice(MAX_ROWS).filter((r) => r[ci] && r[ci]!.span > 0).length;
                        if (!hc) return <div key={ci} style={{ flex: 1 }} />;
                        return (
                          <div key={ci} style={{ flex: 1, display: 'flex', alignItems: 'center', pointerEvents: 'auto' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, paddingLeft: 8, cursor: 'pointer', color: 'var(--accent)' }}>+{hc}</span>
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

        {/* Tooltip */}
        {tooltip && (
          <div style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, zIndex: 100, pointerEvents: 'none' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 10, fontSize: 13, maxWidth: 260,
              background: 'var(--text-primary)', color: 'var(--bg-primary)', boxShadow: 'var(--shadow-lg)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{tooltip.event.title}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{tooltip.event.startDate} → {tooltip.event.endDate}</div>
              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{CATEGORY_NAMES[tooltip.event.category]}</div>
            </div>
          </div>
        )}
      </div>

      {/* ====== 右侧面板折叠按钮 ====== */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'absolute', right: sidebarOpen ? 279 : -1, top: '50%', transform: 'translateY(-50%)',
          zIndex: 20, width: 24, height: 48, borderRadius: '8px 0 0 8px',
          border: '1px solid var(--border-tertiary)', borderRight: 'none',
          background: 'var(--bg-surface)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', transition: 'right .25s ease',
          boxShadow: '-2px 0 8px rgba(0,0,0,.04)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {sidebarOpen
            ? <polyline points="9 18 15 12 9 6" />
            : <polyline points="15 18 9 12 15 6" />
          }
        </svg>
      </button>

      {/* ====== 右侧面板 ====== */}
      <div style={{
        width: sidebarOpen ? 280 : 0, flexShrink: 0,
        borderLeft: sidebarOpen ? '1px solid var(--border-tertiary)' : 'none',
        background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', transition: 'width .25s ease',
      }}>
        <div style={{ width: 280, padding: '20px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* 即将到期 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14,
          }}>即将到期</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcoming.map((evt) => {
              const c = CATEGORY_COLORS[evt.category];
              return (
                <div key={evt.id}
                  onClick={() => openDetailPanel(evt.id)}
                  style={{
                    padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                    border: '1px solid var(--border-tertiary)',
                    background: 'var(--bg-primary)',
                    transition: 'box-shadow .15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                      letterSpacing: '0.04em', color: c,
                    }}>{SHORT_CAT[evt.category] || evt.category}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>{daysUntil(evt.endDate)}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{evt.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>负责人: {evt.owner || '未分配'}</div>
                </div>
              );
            })}
            {upcoming.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-placeholder)', padding: '8px 0' }}>暂无即将到期的活动</div>
            )}
          </div>
        </div>

        {/* 活动筛选 */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14,
          }}>活动筛选</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {categories.map(({ cat, label, color }) => {
              const active = filterCategories.length === 0 || filterCategories.includes(cat);
              return (
                <div key={cat}
                  onClick={() => toggleCat(cat)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                    padding: '4px 0', userSelect: 'none',
                  }}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                    background: color,
                  }} />
                  <span style={{
                    flex: 1, fontSize: 14, fontWeight: 500,
                    color: active ? 'var(--text-primary)' : 'var(--text-disabled)',
                  }}>{label}</span>
                  <div style={{
                    width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? '#3b82f6' : 'var(--bg-tertiary)',
                    transition: 'background .15s',
                  }}>
                    {active && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 弹性空白 */}
        <div style={{ flex: 1 }} />

        {/* 日历洞察卡片 */}
        <div style={{
          padding: '20px 20px', borderRadius: 16,
          background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
          color: '#fff',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>日历洞察</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.85, marginBottom: 14 }}>
            本月共有 {events.length} 个活动排期。
            {events.length > 0 && `活动最密集的时段为第 ${Math.ceil(parseInt(format(parseISO(events[0].startDate), 'd')) / 7)} 周。`}
          </div>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              width: '100%', height: 38, borderRadius: 10,
              border: '1px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.12)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'background .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.22)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; }}
          >查看数据分析</button>
        </div>
        </div>
      </div>
    </div>
  );
}

/* ============ 周视图 ============ */
function WeekView({ currentDate, events, holidays, openDetailPanel, onDoubleClick }: {
  currentDate: Date; events: GameEvent[]; holidays: Holiday[];
  openDetailPanel: (id: string) => void; onDoubleClick: (day: Date) => void;
}) {
  const days = eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, minHeight: 0 }}>
        {days.map((day) => {
          const de = eventsForDay(events, day); const dh = holidaysForDay(holidays, day); const td = isToday(day);
          return (
            <div key={day.toISOString()} style={{ borderRight: '1px solid var(--border-tertiary)', display: 'flex', flexDirection: 'column' }} onDoubleClick={() => onDoubleClick(day)}>
              <div style={{ textAlign: 'center', padding: '16px 8px', borderBottom: '1px solid var(--border-tertiary)', background: td ? 'color-mix(in srgb, #3b82f6 8%, transparent)' : 'transparent' }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{format(day, 'EEE', { locale: zhCN })}</div>
                <div style={{ fontSize: 26, fontWeight: td ? 600 : 300, marginTop: 4, letterSpacing: '-0.02em', color: td ? '#3b82f6' : 'var(--text-primary)' }}>{format(day, 'd')}</div>
                {dh.map((h) => (
                  <div key={h.id} style={{ fontSize: 10, fontWeight: 500, marginTop: 6, color: h.isImportant ? '#ff3b30' : 'var(--text-placeholder)' }}>{h.name}</div>
                ))}
              </div>
              <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                {de.map((evt) => {
                  const c = CATEGORY_COLORS[evt.category];
                  return (
                    <div key={evt.id} onClick={() => openDetailPanel(evt.id)} role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') openDetailPanel(evt.id); }}
                      style={{ padding: 12, borderRadius: 10, cursor: 'pointer', background: 'var(--bg-card)', borderLeft: `3px solid ${c}`, boxShadow: '0 1px 3px rgba(0,0,0,.05)', transition: 'box-shadow .12s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.05)'; }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{evt.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: `${PRIORITY_CONFIG[evt.priority].color}12`, color: PRIORITY_CONFIG[evt.priority].color }}>{evt.priority}</span>
                        {evt.owner && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.owner}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ 日视图 ============ */
function DayView({ currentDate, events, holidays, openDetailPanel, onDoubleClick }: {
  currentDate: Date; events: GameEvent[]; holidays: Holiday[];
  openDetailPanel: (id: string) => void; onDoubleClick: (day: Date) => void;
}) {
  const de = eventsForDay(events, currentDate);
  const dh = holidaysForDay(holidays, currentDate);
  const hours = eachHourOfInterval({ start: startOfDay(currentDate), end: endOfDay(currentDate) });
  const hourH = 60;

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'var(--bg-primary)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid var(--border-tertiary)', padding: '20px 28px', background: 'var(--bg-surface)' }}>
        <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>{format(currentDate, 'yyyy年M月d日 EEEE', { locale: zhCN })}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          {dh.map((h) => (
            <span key={h.id} style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: h.isImportant ? '#fff0f0' : 'var(--bg-tertiary)', color: h.isImportant ? '#ff3b30' : 'var(--text-tertiary)' }}>{h.name}</span>
          ))}
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)' }}>当日活动 · {de.length}</span>
        </div>
      </div>

      {/* 全天活动列表 */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-tertiary)', background: 'var(--bg-secondary)' }}
        onDoubleClick={() => onDoubleClick(currentDate)}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>全天活动</div>
        {de.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {de.map((evt) => {
              const c = CATEGORY_COLORS[evt.category];
              const dur = differenceInDays(parseISO(evt.endDate), parseISO(evt.startDate)) + 1;
              return (
                <div key={evt.id} onClick={() => openDetailPanel(evt.id)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') openDetailPanel(evt.id); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 10, cursor: 'pointer', background: 'var(--bg-card)', borderLeft: `3px solid ${c}`, boxShadow: '0 1px 3px rgba(0,0,0,.05)', transition: 'box-shadow .12s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.05)'; }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{evt.title}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4, color: 'var(--text-tertiary)' }}>{evt.startDate} → {evt.endDate} · {dur}天 · {evt.owner}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${c}12`, color: c }}>{evt.priority}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-placeholder)', fontSize: 13 }}>暂无活动，双击此处创建</div>
        )}
      </div>

      {/* 时间轴（仅显示网格，不再放置虚假事件定位） */}
      <div style={{ position: 'relative', paddingLeft: 80 }}>
        {hours.map((hour) => (
          <div key={hour.toISOString()} style={{ display: 'flex', height: hourH, borderBottom: '1px solid var(--border-tertiary)' }}>
            <div style={{ width: 80, marginLeft: -80, textAlign: 'right', paddingRight: 16, fontSize: 12, fontWeight: 500, paddingTop: 6, color: 'var(--text-muted)' }}>{format(hour, 'HH:mm')}</div>
            <div style={{ flex: 1, borderLeft: '1px solid var(--border-tertiary)' }} />
          </div>
        ))}
        {isToday(currentDate) && (() => {
          const now = new Date(); const ch = now.getHours() + now.getMinutes() / 60;
          return (
            <div style={{ position: 'absolute', left: 0, right: 0, top: ch * hourH, zIndex: 10, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff3b30', marginLeft: -5 }} />
              <div style={{ flex: 1, height: 2, background: '#ff3b30' }} />
            </div>
          );
        })()}
      </div>
    </div>
  );
}
