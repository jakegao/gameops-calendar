import { useEffect, useCallback } from 'react';
import { X, Keyboard } from 'lucide-react';

interface Props { onClose: () => void }

const shortcuts = [
  { key: 'N', desc: '新建活动' },
  { key: '1', desc: '切换到日历视图' },
  { key: '2', desc: '切换到时间线视图' },
  { key: '3', desc: '切换到看板视图' },
  { key: 'Esc', desc: '关闭弹窗/侧边栏' },
  { key: '?', desc: '显示/隐藏快捷键帮助' },
];

export default function HelpModal({ onClose }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="relative w-[400px] rounded-2xl animate-scale-in"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-3">
            <Keyboard size={22} style={{ color: 'var(--accent)' }} />
            <h2 className="text-[20px]" style={{ color: 'var(--text-primary)' }}>键盘快捷键</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center t-bg-hover transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <X size={22} />
          </button>
        </div>
        <div className="px-8 py-6 space-y-4">
          {shortcuts.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>{desc}</span>
              <kbd className="px-3 py-1.5 rounded-lg text-[13px] font-mono font-medium border"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border-secondary)', boxShadow: '0 1px 0 1px rgba(0,0,0,.04)' }}>
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
