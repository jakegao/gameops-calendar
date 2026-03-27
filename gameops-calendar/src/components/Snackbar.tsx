import { useEffect } from 'react';
import { Undo2, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';

export default function Snackbar() {
  const snackbar = useAppStore((s) => s.snackbar);
  const undoDelete = useAppStore((s) => s.undoDelete);
  const dismissSnackbar = useAppStore((s) => s.dismissSnackbar);

  // 5秒后自动消失
  useEffect(() => {
    if (snackbar) {
      const timer = setTimeout(dismissSnackbar, 5000);
      return () => clearTimeout(timer);
    }
  }, [snackbar, dismissSnackbar]);

  if (!snackbar) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
      <div className="flex items-center gap-3 px-5 py-3 rounded-lg min-w-[320px]"
        style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)', boxShadow: '0 4px 12px rgba(0,0,0,.25)' }}>
        <span className="text-[14px] flex-1">{snackbar.message}</span>
        {snackbar.undoEntry && (
          <button onClick={undoDelete}
            className="flex items-center gap-1.5 text-[14px] font-medium transition-colors"
            style={{ color: 'var(--accent)' }}>
            <Undo2 size={16} />
            撤销
          </button>
        )}
        <button onClick={dismissSnackbar} className="transition-colors" style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--bg-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
