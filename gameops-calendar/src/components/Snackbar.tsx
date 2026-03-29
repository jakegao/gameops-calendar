import { useEffect } from 'react';
import { Undo2, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';

export default function Snackbar() {
  const snackbar = useAppStore((s) => s.snackbar);
  const undoDelete = useAppStore((s) => s.undoDelete);
  const dismissSnackbar = useAppStore((s) => s.dismissSnackbar);

  useEffect(() => {
    if (snackbar) { const timer = setTimeout(dismissSnackbar, 5000); return () => clearTimeout(timer); }
  }, [snackbar, dismissSnackbar]);

  if (!snackbar) return null;

  return (
    <div className="animate-fade-in" style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
        borderRadius: 14, minWidth: 340,
        background: 'var(--text-primary)', color: 'var(--bg-primary)',
        boxShadow: '0 8px 24px rgba(0,0,0,.25)',
      }}>
        <span style={{ fontSize: 14, flex: 1 }}>{snackbar.message}</span>
        {snackbar.undoEntry && (
          <button onClick={undoDelete} style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
            borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--accent)', transition: 'background .12s',
          }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <Undo2 size={15} /> 撤销
          </button>
        )}
        <button onClick={dismissSnackbar} style={{
          width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', color: 'rgba(255,255,255,.5)', transition: 'color .12s',
        }} onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,.5)'; }}>
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
