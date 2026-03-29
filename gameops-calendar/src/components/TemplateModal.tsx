import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { CATEGORY_NAMES, CATEGORY_COLORS } from '../constants/index.ts';
import type { EventCategory } from '../types/index.ts';

const CATEGORIES = Object.keys(CATEGORY_NAMES) as EventCategory[];

export default function TemplateModal() {
  const { isTemplateModalOpen, closeTemplateModal, templates, createFromTemplate } = useAppStore();
  const [selectedTplId, setSelectedTplId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('2026-04-01');
  const [filterCat, setFilterCat] = useState<EventCategory | ''>('');

  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') closeTemplateModal(); }, [closeTemplateModal]);
  useEffect(() => {
    if (isTemplateModalOpen) { document.addEventListener('keydown', handleKeyDown); return () => document.removeEventListener('keydown', handleKeyDown); }
  }, [isTemplateModalOpen, handleKeyDown]);

  if (!isTemplateModalOpen) return null;
  const filtered = filterCat ? templates.filter((t) => t.category === filterCat) : templates;
  const handleCreate = () => { if (selectedTplId && startDate) { createFromTemplate(selectedTplId, startDate); setSelectedTplId(null); } };

  return (
    <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)' }} onClick={closeTemplateModal} />
      <div className="animate-scale-in" style={{
        position: 'relative', width: 620, maxHeight: '85vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', borderRadius: 16,
        background: 'var(--bg-surface)', boxShadow: '0 20px 60px rgba(0,0,0,.15)',
      }}>
        {/* 头部 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 56, borderBottom: '1px solid var(--border-tertiary)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>从模板创建</h2>
          </div>
          <button onClick={closeTemplateModal} style={{
            width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: 'var(--text-tertiary)', transition: 'background .12s',
          }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <X size={20} />
          </button>
        </div>

        {/* 分类筛选 */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-tertiary)', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <button onClick={() => setFilterCat('')} style={{
            height: 34, padding: '0 16px', borderRadius: 17, fontSize: 13, fontWeight: 600,
            border: 'none', cursor: 'pointer',
            background: !filterCat ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: !filterCat ? '#fff' : 'var(--text-muted)',
            transition: 'all .12s',
          }}>全部</button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setFilterCat(c)} style={{
              height: 34, padding: '0 16px', borderRadius: 17, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: filterCat === c ? CATEGORY_COLORS[c] : 'var(--bg-tertiary)',
              color: filterCat === c ? '#fff' : 'var(--text-muted)',
              transition: 'all .12s',
            }}>{CATEGORY_NAMES[c]}</button>
          ))}
        </div>

        {/* 模板列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {filtered.map((tpl) => (
              <button key={tpl.id} onClick={() => setSelectedTplId(tpl.id)} style={{
                textAlign: 'left' as const, padding: 18, borderRadius: 14, cursor: 'pointer',
                border: `2px solid ${selectedTplId === tpl.id ? 'var(--accent)' : 'var(--border-tertiary)'}`,
                background: selectedTplId === tpl.id ? 'var(--accent-bg)' : 'transparent',
                boxShadow: selectedTplId === tpl.id ? '0 2px 8px rgba(59,130,246,.1)' : 'none',
                transition: 'all .12s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{tpl.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{tpl.name}</span>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: 10 }}>{tpl.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px',
                    borderRadius: 5, fontSize: 11, fontWeight: 600,
                    background: `color-mix(in srgb, ${CATEGORY_COLORS[tpl.category]} 12%, transparent)`,
                    color: CATEGORY_COLORS[tpl.category],
                  }}>{CATEGORY_NAMES[tpl.category]}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>{tpl.defaultDuration}天</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 底部 */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid var(--border-tertiary)',
          display: 'flex', alignItems: 'flex-end', gap: 14, flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>开始日期</div>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{
              width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border-secondary)',
              padding: '0 14px', fontSize: 14, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none',
            }} />
          </div>
          <button onClick={handleCreate} disabled={!selectedTplId || !startDate} style={{
            height: 42, padding: '0 24px', borderRadius: 21, fontSize: 14, fontWeight: 600,
            background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
            opacity: (!selectedTplId || !startDate) ? 0.4 : 1,
            boxShadow: '0 2px 8px rgba(59,130,246,.25)', transition: 'transform .1s',
          }} onMouseEnter={(e) => { if (selectedTplId) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}>
            创建活动
          </button>
        </div>
      </div>
    </div>
  );
}
