import { useState, useRef, useEffect } from 'react';
import { Search, Filter, Layers, ChevronLeft, ChevronRight, Diamond, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CATEGORY_NAMES, LAYER_CONFIG, ROLE_CONFIG } from '../constants/index.ts';
import type { EventCategory, LayerType, TeamRole } from '../types/index.ts';

interface Props { viewLabel: string }

export default function TopBar({ viewLabel }: Props) {
  const {
    currentView, calendarView, setCalendarView,
    currentDate, setCurrentDate, searchQuery, setSearchQuery,
    visibleLayers, toggleLayer, filterCategories, setFilterCategories,
    filterRole, setFilterRole,
  } = useAppStore();

  const [showLayerDropdown, setShowLayerDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (layerRef.current && !layerRef.current.contains(e.target as Node)) setShowLayerDropdown(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ---- 导航 ---- */
  const navigatePrev = () => {
    if (currentView === 'calendar') {
      if (calendarView === 'month') setCurrentDate(subMonths(currentDate, 1));
      else if (calendarView === 'week') setCurrentDate(subWeeks(currentDate, 1));
      else setCurrentDate(subDays(currentDate, 1));
    } else setCurrentDate(subMonths(currentDate, 1));
  };
  const navigateNext = () => {
    if (currentView === 'calendar') {
      if (calendarView === 'month') setCurrentDate(addMonths(currentDate, 1));
      else if (calendarView === 'week') setCurrentDate(addWeeks(currentDate, 1));
      else setCurrentDate(addDays(currentDate, 1));
    } else setCurrentDate(addMonths(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date(2026, 2, 26));

  const dateLabel = () => {
    if (calendarView === 'month' || currentView !== 'calendar') return format(currentDate, 'yyyy年M月', { locale: zhCN });
    if (calendarView === 'week') return format(currentDate, 'yyyy年 M月 第W周', { locale: zhCN });
    return format(currentDate, 'yyyy年M月d日', { locale: zhCN });
  };

  const toggleCategoryFilter = (cat: EventCategory) => {
    setFilterCategories(filterCategories.includes(cat) ? filterCategories.filter((c) => c !== cat) : [...filterCategories, cat]);
  };

  const activeFilterCount = filterCategories.length + (filterRole ? 1 : 0);

  return (
    <div style={{
      height: 60, display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 12, flexShrink: 0,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-primary)',
    }}>

      {/* ====== 左侧：搜索框（常驻pill形） ====== */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Search size={16} style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-placeholder)',
        }} />
        <input
          type="text" placeholder="搜索活动内容..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: 260, height: 40, borderRadius: 20,
            paddingLeft: 40, paddingRight: searchQuery ? 36 : 16,
            fontSize: 14, border: '1px solid var(--border-secondary)',
            background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
            outline: 'none', transition: 'border-color .15s, box-shadow .15s',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-secondary)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-hover)', color: 'var(--text-tertiary)',
          }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* ====== 中间：日期导航（居中） ====== */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {/* 左箭头 */}
        <button onClick={navigatePrev} style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', color: 'var(--text-tertiary)',
          transition: 'background .12s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* 日期文字 */}
        <span style={{
          fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
          letterSpacing: '-0.01em', userSelect: 'none', padding: '0 4px',
        }}>{dateLabel()}</span>

        {/* Today 按钮 */}
        <button onClick={goToday} style={{
          height: 30, padding: '0 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: 'transparent', color: 'var(--accent)',
          fontSize: 14, fontWeight: 600, transition: 'background .12s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 8%, transparent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >Today</button>

        {/* 右箭头 */}
        <button onClick={navigateNext} style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', color: 'var(--text-tertiary)',
          transition: 'background .12s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ChevronRight size={20} />
        </button>

        {/* 日历子视图切换（仅日历视图显示，紧跟在日期导航后） */}
        {currentView === 'calendar' && (
          <div style={{
            display: 'flex', marginLeft: 8, borderRadius: 8, overflow: 'hidden',
            border: '1px solid var(--border-secondary)',
          }}>
            {(['month', 'week', 'day'] as const).map((v, i) => (
              <button key={v} onClick={() => setCalendarView(v)} style={{
                height: 32, padding: '0 16px', fontSize: 13, fontWeight: 500,
                border: 'none', cursor: 'pointer',
                borderLeft: i > 0 ? '1px solid var(--border-secondary)' : 'none',
                background: calendarView === v ? 'var(--bg-active)' : 'transparent',
                color: calendarView === v ? 'var(--text-active)' : 'var(--text-tertiary)',
                transition: 'background .12s, color .12s',
              }}
                onMouseEnter={(e) => { if (calendarView !== v) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (calendarView !== v) e.currentTarget.style.background = 'transparent'; }}
              >
                {{ month: '月', week: '周', day: '日' }[v]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ====== 右侧：Filter + View Layers ====== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

        {/* Filter 按钮（pill边框样式） */}
        <div style={{ position: 'relative' }} ref={filterRef}>
          <button
            onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowLayerDropdown(false); }}
            style={{
              height: 40, padding: '0 18px', borderRadius: 20,
              border: '1px solid var(--border-secondary)',
              background: activeFilterCount > 0 ? 'color-mix(in srgb, var(--accent) 6%, var(--bg-surface))' : 'var(--bg-surface)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 500,
              color: activeFilterCount > 0 ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'border-color .12s, background .12s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-secondary)'; }}
          >
            <Filter size={15} />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--accent)', color: '#fff',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{activeFilterCount}</span>
            )}
          </button>

          {/* Filter 下拉 */}
          {showFilterDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 8,
              width: 260, borderRadius: 14, padding: '8px 0',
              background: 'var(--bg-surface)', border: '1px solid var(--border-primary)',
              boxShadow: '0 8px 32px rgba(0,0,0,.12)', zIndex: 50,
              maxHeight: '70vh', overflowY: 'auto',
            }}>
              <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>活动类型</div>
              {(Object.keys(CATEGORY_NAMES) as EventCategory[]).map((cat) => (
                <button key={cat} onClick={() => toggleCategoryFilter(cat)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', fontSize: 14, border: 'none', cursor: 'pointer',
                    background: 'transparent', color: 'var(--text-secondary)', transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${filterCategories.includes(cat) ? 'var(--accent)' : 'var(--border-secondary)'}`,
                    background: filterCategories.includes(cat) ? 'var(--accent)' : 'transparent',
                    transition: 'all .12s',
                  }}>
                    {filterCategories.includes(cat) && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
                  </div>
                  <span>{CATEGORY_NAMES[cat]}</span>
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--border-primary)', margin: '6px 0' }} />
              <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>角色视图</div>
              <button onClick={() => setFilterRole(null)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 14,
                  border: 'none', cursor: 'pointer', background: 'transparent',
                  color: !filterRole ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: !filterRole ? 600 : 400, transition: 'background .1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >全部角色</button>
              {(Object.keys(ROLE_CONFIG) as TeamRole[]).map((role) => (
                <button key={role} onClick={() => setFilterRole(role === filterRole ? null : role)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', fontSize: 14, border: 'none', cursor: 'pointer',
                    background: 'transparent',
                    color: filterRole === role ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: filterRole === role ? 600 : 400, transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 18 }}>{ROLE_CONFIG[role].icon}</span>
                  <span>{ROLE_CONFIG[role].name}</span>
                </button>
              ))}
              {activeFilterCount > 0 && (
                <>
                  <div style={{ borderTop: '1px solid var(--border-primary)', margin: '6px 0' }} />
                  <button onClick={() => { setFilterCategories([]); setFilterRole(null); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 14,
                      fontWeight: 600, color: '#ff3b30', border: 'none', cursor: 'pointer',
                      background: 'transparent', transition: 'background .1s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >清除筛选</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* View Layers 深色实心按钮（对齐截图） */}
        <div style={{ position: 'relative' }} ref={layerRef}>
          <button
            onClick={() => { setShowLayerDropdown(!showLayerDropdown); setShowFilterDropdown(false); }}
            style={{
              height: 40, padding: '0 20px', borderRadius: 20,
              border: 'none', cursor: 'pointer',
              background: showLayerDropdown ? 'var(--accent)' : '#1e293b',
              color: '#fff', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,.15)',
              transition: 'background .15s, box-shadow .15s, transform .1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.15)'; }}
          >
            <Diamond size={14} fill="#fff" />
            <span>View Layers</span>
          </button>

          {/* Layers 下拉 */}
          {showLayerDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 8,
              width: 240, borderRadius: 14, padding: '8px 0',
              background: 'var(--bg-surface)', border: '1px solid var(--border-primary)',
              boxShadow: '0 8px 32px rgba(0,0,0,.12)', zIndex: 50,
            }}>
              <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)' }}>显示图层</div>
              {(Object.keys(LAYER_CONFIG) as LayerType[]).map((layer) => (
                <button key={layer} onClick={() => toggleLayer(layer)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', fontSize: 14, border: 'none', cursor: 'pointer',
                    background: 'transparent', color: 'var(--text-secondary)', transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${visibleLayers[layer] ? 'var(--accent)' : 'var(--border-secondary)'}`,
                    background: visibleLayers[layer] ? 'var(--accent)' : 'transparent',
                    transition: 'all .12s',
                  }}>
                    {visibleLayers[layer] && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
                  </div>
                  <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: LAYER_CONFIG[layer].color }} />
                  <span>{LAYER_CONFIG[layer].name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
