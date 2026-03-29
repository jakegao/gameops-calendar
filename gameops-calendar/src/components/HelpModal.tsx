import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface Props { onClose: () => void }

const shortcuts = [
  { key: 'N', desc: '新建活动' },
  { key: '1', desc: '切换到日历视图' },
  { key: '2', desc: '切换到时间线视图' },
  { key: '3', desc: '切换到看板视图' },
  { key: '4', desc: '切换到数据面板' },
  { key: 'Esc', desc: '关闭弹窗/侧边栏' },
  { key: '?', desc: '显示/隐藏快捷键帮助' },
];

export default function HelpModal({ onClose }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => { document.addEventListener('keydown', handleKeyDown); return () => document.removeEventListener('keydown', handleKeyDown); }, [handleKeyDown]);

  return (
    <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)' }} onClick={onClose} />
      <div className="animate-scale-in" style={{
        position: 'relative', width: 380, borderRadius: 16,
        background: 'var(--bg-surface)', boxShadow: '0 20px 60px rgba(0,0,0,.15)',
      }}>
        {/* 头部 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 56, borderBottom: '1px solid var(--border-tertiary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M6 12h.001M10 12h.001M14 12h.001M18 12h.001M6 16h.001M10 16h.001M14 16h.001M18 16h.001"/>
            </svg>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>键盘快捷键</h2>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: 'var(--text-tertiary)', transition: 'background .12s',
          }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <X size={20} />
          </button>
        </div>

        {/* 快捷键列表 */}
        <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {shortcuts.map(({ key, desc }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{desc}</span>
              <kbd style={{
                padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: 'monospace',
                background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                border: '1px solid var(--border-secondary)', boxShadow: '0 1px 0 1px rgba(0,0,0,.03)',
              }}>{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
