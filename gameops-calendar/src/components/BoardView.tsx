import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore.ts';
import { CATEGORY_COLORS, CATEGORY_NAMES, STATUS_CONFIG } from '../constants/index.ts';
import type { EventStatus } from '../types/index.ts';
import { MoreHorizontal, Plus, Clock } from 'lucide-react';

const STATUS_ORDER: EventStatus[] = ['draft', 'planned', 'in_review', 'approved', 'in_progress', 'live', 'completed', 'cancelled'];

export default function BoardView() {
  const openDetailPanel = useAppStore((s) => s.openDetailPanel);
  const openEventModal = useAppStore((s) => s.openEventModal);
  const updateEvent = useAppStore((s) => s.updateEvent);
  const storeEvents = useAppStore((s) => s.events);
  const filterCategories = useAppStore((s) => s.filterCategories);
  const filterRole = useAppStore((s) => s.filterRole);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const visibleLayers = useAppStore((s) => s.visibleLayers);
  const getFilteredEvents = useAppStore((s) => s.getFilteredEvents);
  const events = useMemo(() => getFilteredEvents(), [storeEvents, filterCategories, filterRole, searchQuery, visibleLayers, getFilteredEvents]);
  const [showEmpty, setShowEmpty] = useState(true);

  const allColumns = STATUS_ORDER.map((status) => ({
    status, config: STATUS_CONFIG[status], events: events.filter((e) => e.status === status),
  }));
  const visibleColumns = showEmpty ? allColumns : allColumns.filter((c) => c.events.length > 0);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center" style={{ maxWidth: 320 }}>
          <div style={{ width: 80, height: 80, margin: '0 auto 24px', borderRadius: 16, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-placeholder)" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, marginBottom: 12, color: 'var(--text-secondary)' }}>没有匹配的活动</div>
          <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-tertiary)' }}>尝试调整筛选条件，或按 N 新建活动</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowX: 'auto', position: 'relative', background: 'var(--bg-secondary)' }}>

      {/* 列容器 */}
      <div style={{ display: 'flex', gap: 14, padding: '20px 24px', height: '100%', minWidth: 'max-content', alignItems: 'stretch' }} role="list">
        {visibleColumns.map(({ status, config, events: col }) => (
          <div key={status} role="listitem"
            style={{ width: 250, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRadius: 12, background: 'var(--bg-tertiary)', transition: 'background .15s' }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => {
              e.preventDefault();
              const el = e.currentTarget;
              const c = parseInt(el.dataset.dragcount || '0', 10) + 1;
              el.dataset.dragcount = String(c);
              el.style.background = 'var(--accent-bg)';
            }}
            onDragLeave={(e) => {
              const el = e.currentTarget;
              const c = parseInt(el.dataset.dragcount || '0', 10) - 1;
              el.dataset.dragcount = String(c);
              if (c <= 0) { el.dataset.dragcount = '0'; el.style.background = 'var(--bg-tertiary)'; }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.dataset.dragcount = '0';
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              const id = e.dataTransfer.getData('text/plain');
              if (id) updateEvent(id, { status });
            }}>

            {/* 列头 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 48, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{config.name}</span>
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-hover)', fontVariantNumeric: 'tabular-nums' }}>{col.length}</span>
              </div>
              <button className="t-bg-hover" style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <MoreHorizontal size={16} />
              </button>
            </div>

            {/* 卡片列表 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {col.map((evt) => {
                const catColor = CATEGORY_COLORS[evt.category];
                const catName = CATEGORY_NAMES[evt.category].replace(/^[^\u4e00-\u9fa5a-zA-Z]*/, '');
                return (
                  <div key={evt.id} draggable role="button" tabIndex={0}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', evt.id);
                      e.currentTarget.style.opacity = '0.4';
                      e.currentTarget.style.transform = 'rotate(1.5deg) scale(1.02)';
                    }}
                    onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
                    onClick={() => openDetailPanel(evt.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') openDetailPanel(evt.id); }}
                    style={{
                      borderRadius: 12,
                      background: 'var(--bg-card)',
                      boxShadow: '0 1px 3px rgba(0,0,0,.05)',
                      cursor: 'pointer',
                      transition: 'box-shadow .15s, transform .15s',
                      padding: '16px 16px 14px',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.05)'; }}>

                    {/* 分类标签 pill */}
                    <div style={{ marginBottom: 10 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        height: 24, padding: '0 10px', borderRadius: 6,
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
                        background: `${catColor}18`, color: catColor,
                      }}>
                        {catName}
                      </span>
                    </div>

                    {/* 标题 */}
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'var(--text-primary)', marginBottom: 14 }}>
                      {evt.title}
                    </div>

                    {/* 底部: 日期 + 头像 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={13} style={{ color: 'var(--text-placeholder)' }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-placeholder)', fontVariantNumeric: 'tabular-nums' }}>
                          {evt.startDate.slice(5)}
                        </span>
                      </div>
                      {evt.owner ? (
                        <span style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: catColor, color: '#fff',
                          fontSize: 11, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }} title={evt.owner}>
                          {evt.owner[0]}
                        </span>
                      ) : <div style={{ width: 28 }} />}
                    </div>
                  </div>
                );
              })}

              {col.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-placeholder)' }}>拖拽活动到此处</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 右下角浮动新建按钮 */}
      <button
        onClick={() => openEventModal()}
        style={{
          position: 'fixed', right: 28, bottom: 28,
          width: 52, height: 52, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,113,227,.35)',
          transition: 'transform .15s', zIndex: 30,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        title="新建活动">
        <Plus size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}
