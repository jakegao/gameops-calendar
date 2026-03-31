import { useMemo } from 'react';
import {
  Calendar, BarChart3, LayoutGrid, Menu,
  Sparkles, ArrowLeftRight, HelpCircle, Moon, Sun, BarChart2, GanttChart, FolderOpen,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';

interface Props { expanded: boolean; onToggle: () => void; darkMode: boolean; onToggleDark: () => void; onShowHelp?: () => void }

export default function Sidebar({ expanded, onToggle, darkMode, onToggleDark, onShowHelp }: Props) {
  const { currentView, setCurrentView, openTemplateModal, openExportModal, openVersionManager } = useAppStore();

  /* ---- 导航项（对齐截图中的6项） ---- */
  const navItems = [
    { key: 'dashboard' as const, icon: BarChart2, label: '数据面板' },
    { key: 'calendar' as const, icon: Calendar, label: '日历' },
    { key: 'gantt' as const, icon: GanttChart, label: '时间线' },
    { key: 'board' as const, icon: LayoutGrid, label: '看板' },
  ];

  /* ---- Tooltip（收起态 hover 显示） ---- */
  const Tip = ({ text }: { text: string }) => !expanded ? (
    <div style={{
      position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
      marginLeft: 14, padding: '6px 14px', fontSize: 13, borderRadius: 8, whiteSpace: 'nowrap',
      background: darkMode ? '#48484a' : '#1d1d1f', color: '#f5f5f7',
      boxShadow: '0 4px 14px rgba(0,0,0,.18)', opacity: 0, pointerEvents: 'none',
      transition: 'opacity .15s ease .3s',
    }} className="group-hover:!opacity-100">{text}</div>
  ) : null;

  /* ---- 单个导航项渲染 ---- */
  const NavBtn = ({ k, icon: Icon, label }: { k: string; icon: typeof Calendar; label: string }) => {
    const active = currentView === k;
    return (
      <div style={{ position: 'relative' }} className="group">
        <button
          onClick={() => setCurrentView(k as any)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: 14, height: 48, borderRadius: 12,
            padding: expanded ? '0 16px' : '0',
            justifyContent: expanded ? 'flex-start' : 'center',
            background: active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
            color: active ? 'var(--accent)' : 'var(--text-nav)',
            border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500,
            transition: 'background .15s, color .15s',
          }}
          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
        >
          <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
          {expanded && <span>{label}</span>}
        </button>
        <Tip text={label} />
      </div>
    );
  };

  return (
    <div style={{
      width: expanded ? 272 : 80,
      flexShrink: 0, display: 'flex', flexDirection: 'column', height: '100%',
      borderRight: '1px solid var(--border-tertiary)',
      background: 'var(--bg-surface)',
      transition: 'width .2s ease',
      overflow: 'hidden',
    }}>

      {/* ====== 顶部 Logo 区（对齐截图：头像+标题+副标题） ====== */}
      <div style={{
        padding: expanded ? '28px 24px 24px' : '28px 0 20px',
        display: 'flex', flexDirection: expanded ? 'row' : 'column',
        alignItems: 'center', gap: expanded ? 14 : 8, flexShrink: 0,
        justifyContent: expanded ? 'flex-start' : 'center',
      }}>
        {/* 头像 */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent), #60a5fa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18, fontWeight: 700,
          boxShadow: '0 2px 8px rgba(59,130,246,.25)',
        }}>G</div>
        {expanded && (
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.01em', lineHeight: 1.3,
            }}>GameOps Studio</div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-placeholder)',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2,
            }}>运营排期工具</div>
          </div>
        )}
        {/* 收起态的 hamburger */}
        {!expanded && (
          <button onClick={onToggle} style={{
            width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4,
            background: 'transparent', color: 'var(--text-tertiary)', transition: 'background .15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Menu size={18} />
          </button>
        )}
      </div>

      {/* 展开态 hamburger */}
      {expanded && (
        <div style={{ padding: '0 20px 8px', flexShrink: 0 }}>
          <button onClick={onToggle} style={{
            width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: 'var(--text-tertiary)', transition: 'background .15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Menu size={20} />
          </button>
        </div>
      )}

      {/* ====== 导航列表（对齐截图：6项，宽松间距） ====== */}
      <nav style={{ padding: expanded ? '0 20px' : '0 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(({ key, icon, label }) => (
          <NavBtn key={key} k={key} icon={icon} label={label} />
        ))}
        {/* 模板创建（对齐截图中的 Template Creation） */}
        <div style={{ position: 'relative' }} className="group">
          <button
            onClick={openTemplateModal}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 14, height: 48, borderRadius: 12,
              padding: expanded ? '0 16px' : '0',
              justifyContent: expanded ? 'flex-start' : 'center',
              background: 'transparent', color: 'var(--text-nav)',
              border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500,
              transition: 'background .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Sparkles size={20} strokeWidth={1.6} />
            {expanded && <span>模板创建</span>}
          </button>
          <Tip text="模板创建" />
        </div>
        {/* 版本管理 */}
        <div style={{ position: 'relative' }} className="group">
          <button
            onClick={openVersionManager}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: 14, height: 48, borderRadius: 12,
              padding: expanded ? '0 16px' : '0',
              justifyContent: expanded ? 'flex-start' : 'center',
              background: 'transparent', color: 'var(--text-nav)',
              border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500,
              transition: 'background .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <FolderOpen size={20} strokeWidth={1.6} />
            {expanded && <span>版本管理</span>}
          </button>
          <Tip text="版本管理" />
        </div>
      </nav>

      {/* ====== 中间弹性空白（对齐截图中大段留白） ====== */}
      <div style={{ flex: 1 }} />

      {/* ====== 底部区域（对齐截图：蓝色按钮+Settings+Support） ====== */}
      <div style={{ padding: expanded ? '0 20px 24px' : '0 12px 24px', flexShrink: 0 }}>

        {/* 导出/导入 蓝色大按钮（对齐截图中 Export/Import 全宽圆角按钮） */}
        <div style={{ position: 'relative', marginBottom: expanded ? 20 : 16 }} className="group">
          <button onClick={openExportModal} style={{
            width: '100%', height: 48, borderRadius: 24, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 14, fontWeight: 600, letterSpacing: '0.01em',
            boxShadow: '0 4px 14px rgba(59,130,246,.3)',
            transition: 'box-shadow .15s, transform .1s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,130,246,.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,.3)'; e.currentTarget.style.transform = 'none'; }}
          >
            <ArrowLeftRight size={18} />
            {expanded && <span>导出 / 导入</span>}
          </button>
          <Tip text="导出 / 导入" />
        </div>

        {/* 主题切换 */}
        <div style={{ position: 'relative' }} className="group">
          <button onClick={onToggleDark} style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: 14, height: 44, borderRadius: 10, border: 'none', cursor: 'pointer',
            padding: expanded ? '0 16px' : '0',
            justifyContent: expanded ? 'flex-start' : 'center',
            background: 'transparent', color: 'var(--text-nav)',
            fontSize: 14, fontWeight: 500, transition: 'background .15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {darkMode ? <Sun size={19} strokeWidth={1.6} /> : <Moon size={19} strokeWidth={1.6} />}
            {expanded && <span>{darkMode ? '浅色主题' : '深色主题'}</span>}
          </button>
          <Tip text={darkMode ? '浅色主题' : '深色主题'} />
        </div>

        {/* 帮助支持 */}
        <div style={{ position: 'relative' }} className="group">
          <button onClick={() => onShowHelp?.()} style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: 14, height: 44, borderRadius: 10, border: 'none', cursor: 'pointer',
            padding: expanded ? '0 16px' : '0',
            justifyContent: expanded ? 'flex-start' : 'center',
            background: 'transparent', color: 'var(--text-nav)',
            fontSize: 14, fontWeight: 500, transition: 'background .15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <HelpCircle size={19} strokeWidth={1.6} />
            {expanded && <span>帮助支持</span>}
          </button>
          <Tip text="帮助支持" />
        </div>
      </div>
    </div>
  );
}
