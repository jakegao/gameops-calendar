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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') closeTemplateModal();
  }, [closeTemplateModal]);

  useEffect(() => {
    if (isTemplateModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isTemplateModalOpen, handleKeyDown]);

  if (!isTemplateModalOpen) return null;
  const filtered = filterCat ? templates.filter((t) => t.category === filterCat) : templates;
  const handleCreate = () => { if (selectedTplId && startDate) { createFromTemplate(selectedTplId, startDate); setSelectedTplId(null); } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/25" onClick={closeTemplateModal} />
      <div className="relative max-h-[85vh] overflow-hidden flex flex-col rounded-2xl animate-scale-in"
        style={{ width: 640, background: 'var(--bg-surface)', boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-3">
            <Sparkles size={22} style={{ color: 'var(--accent)' }} />
            <h2 className="text-[20px]" style={{ color: 'var(--text-primary)' }}>从模板创建</h2>
          </div>
          <button onClick={closeTemplateModal} className="w-11 h-11 rounded-full flex items-center justify-center t-bg-hover transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <X size={22} />
          </button>
        </div>

        <div className="px-8 py-4 border-b flex gap-2 flex-wrap" style={{ borderColor: 'var(--border-primary)' }}>
          <button onClick={() => setFilterCat('')}
            className="h-10 px-5 rounded-full text-[14px] font-medium transition-all"
            style={{ background: !filterCat ? 'var(--accent)' : 'var(--bg-tertiary)', color: !filterCat ? '#fff' : 'var(--text-tertiary)' }}>
            全部
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setFilterCat(c)}
              className="h-10 px-5 rounded-full text-[14px] font-medium transition-all"
              style={{ backgroundColor: filterCat === c ? CATEGORY_COLORS[c] : 'var(--bg-tertiary)', color: filterCat === c ? '#fff' : 'var(--text-tertiary)' }}>
              {CATEGORY_NAMES[c]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((tpl) => (
              <button key={tpl.id} onClick={() => setSelectedTplId(tpl.id)}
                className="text-left p-5 rounded-2xl transition-all border-2"
                style={{
                  background: selectedTplId === tpl.id ? 'var(--accent-bg)' : 'transparent',
                  borderColor: selectedTplId === tpl.id ? 'var(--accent)' : 'var(--border-secondary)',
                  boxShadow: selectedTplId === tpl.id ? 'var(--shadow-sm)' : 'none',
                }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[24px]">{tpl.icon}</span>
                  <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>{tpl.name}</span>
                </div>
                <div className="text-[13px] mb-3 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{tpl.description}</div>
                <div className="flex items-center gap-2">
                  {/* B17: 模板分类名保留完整emoji */}
                  <span className="badge" style={{ backgroundColor: `${CATEGORY_COLORS[tpl.category]}18`, color: CATEGORY_COLORS[tpl.category] }}>
                    {CATEGORY_NAMES[tpl.category]}
                  </span>
                  <span className="text-[12px]" style={{ color: 'var(--text-placeholder)' }}>{tpl.defaultDuration}天</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 py-5 border-t flex items-end gap-5" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex-1">
            <div className="text-[13px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>开始日期</div>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <button onClick={handleCreate} disabled={!selectedTplId || !startDate}
            className="btn-primary h-11 px-6 text-[14px] disabled:opacity-40 disabled:cursor-not-allowed">
            创建活动
          </button>
        </div>
      </div>
    </div>
  );
}
