import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore.ts';
import { CATEGORY_COLORS, CATEGORY_NAMES, STATUS_CONFIG, PRIORITY_CONFIG } from '../constants/index.ts';
import type { EventStatus } from '../types/index.ts';
import { ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_ORDER: EventStatus[] = ['draft', 'planned', 'in_review', 'approved', 'in_progress', 'live', 'completed', 'cancelled'];

export default function BoardView() {
  const openDetailPanel = useAppStore((s) => s.openDetailPanel);
  const updateEvent = useAppStore((s) => s.updateEvent);
  const storeEvents = useAppStore((s) => s.events);
  const filterCategories = useAppStore((s) => s.filterCategories);
  const filterRole = useAppStore((s) => s.filterRole);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const visibleLayers = useAppStore((s) => s.visibleLayers);
  const getFilteredEvents = useAppStore((s) => s.getFilteredEvents);
  const events = useMemo(() => getFilteredEvents(), [storeEvents, filterCategories, filterRole, searchQuery, visibleLayers, getFilteredEvents]);
  const [showEmpty, setShowEmpty] = useState(false);

  const allColumns = STATUS_ORDER.map((status) => ({
    status, config: STATUS_CONFIG[status], events: events.filter((e) => e.status === status),
  }));
  const visibleColumns = showEmpty ? allColumns : allColumns.filter((c) => c.events.length > 0);
  const hiddenCount = allColumns.length - allColumns.filter((c) => c.events.length > 0).length;

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-placeholder)" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </div>
          <div className="text-[16px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>没有匹配的活动</div>
          <div className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>尝试调整筛选条件，或按 <kbd className="px-1.5 py-0.5 rounded text-[12px] font-mono border" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-secondary)' }}>N</kbd> 新建活动</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-x-auto p-6" style={{ background: 'var(--bg-secondary)' }}>
      {hiddenCount > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <button onClick={() => setShowEmpty(!showEmpty)}
            className="flex items-center gap-1.5 text-[13px] transition-colors"
            style={{ color: 'var(--text-tertiary)' }}>
            {showEmpty ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            {showEmpty ? '隐藏空列' : `显示 ${hiddenCount} 个空列`}
          </button>
        </div>
      )}
      <div className="flex gap-4 h-[calc(100%-2rem)] min-w-max" role="list">
        {visibleColumns.map(({ status, config, events: col }) => (
          <div key={status} role="listitem" aria-label={`${config.name} 列，${col.length} 个活动`}
            className="w-80 flex-shrink-0 flex flex-col rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-tertiary)' }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDragEnter={(e) => {
              e.preventDefault();
              const el = e.currentTarget;
              const count = parseInt(el.dataset.dragcount || '0', 10) + 1;
              el.dataset.dragcount = String(count);
              el.style.background = 'var(--accent-bg)';
            }}
            onDragLeave={(e) => {
              const el = e.currentTarget;
              const count = parseInt(el.dataset.dragcount || '0', 10) - 1;
              el.dataset.dragcount = String(count);
              if (count <= 0) { el.dataset.dragcount = '0'; el.style.background = 'var(--bg-tertiary)'; }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.dataset.dragcount = '0';
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              const id = e.dataTransfer.getData('text/plain');
              if (id) updateEvent(id, { status });
            }}>
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: config.color }} />
              <span className="text-[14px] font-medium" style={{ color: 'var(--text-secondary)' }}>{config.name}</span>
              <span className="ml-auto text-[13px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{col.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
              {col.map((evt) => (
                <div key={evt.id} draggable role="button" tabIndex={0} aria-label={evt.title}
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', evt.id); e.currentTarget.style.opacity = '0.6'; }}
                  onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; }}
                  onClick={() => openDetailPanel(evt.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') openDetailPanel(evt.id); }}
                  className="p-4 rounded-xl cursor-pointer hover:shadow-md transition-shadow border border-transparent"
                  style={{ background: 'var(--bg-card)' }}>
                  <div className="text-[14px] font-medium leading-snug mb-2" style={{ color: 'var(--text-secondary)' }}>{evt.title}</div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="badge text-[11px]" style={{ backgroundColor: `${CATEGORY_COLORS[evt.category]}18`, color: CATEGORY_COLORS[evt.category] }}>
                      {CATEGORY_NAMES[evt.category]}
                    </span>
                    <span className="badge text-[11px]" style={{ backgroundColor: `${PRIORITY_CONFIG[evt.priority].color}12`, color: PRIORITY_CONFIG[evt.priority].color }}>
                      {evt.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{evt.startDate} → {evt.endDate}</span>
                    {evt.owner && (
                      <span className="w-7 h-7 rounded-full bg-[#1a73e8] text-white text-[11px] font-medium flex items-center justify-center" title={evt.owner}>
                        {evt.owner[0]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {col.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center mb-3" style={{ borderColor: 'var(--border-secondary)' }}>
                    <span className="text-[20px]" style={{ color: 'var(--border-secondary)' }}>+</span>
                  </div>
                  <span className="text-[13px]" style={{ color: 'var(--text-placeholder)' }}>拖拽活动到此列</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
