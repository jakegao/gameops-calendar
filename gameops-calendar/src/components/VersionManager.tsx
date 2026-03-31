import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Plus, Edit3, Trash2, Calendar, RotateCcw, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { VERSION_STATUS_CONFIG, VERSION_COLORS } from '../constants/index.ts';
import type { VersionStatus } from '../types/index.ts';
import { format, parseISO, differenceInDays, isSameDay } from 'date-fns';

const SIM_TODAY = new Date(2026, 2, 26);
const STATUSES: VersionStatus[] = ['planning', 'active', 'completed'];

export default function VersionManager() {
  const { isVersionManagerOpen, closeVersionManager, versions, addVersion, updateVersion, deleteVersion, setFilterVersionId, setCurrentDate, events } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', displayName: '', startDate: '', endDate: '', status: 'planning' as VersionStatus, color: VERSION_COLORS[0], description: '' });

  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') closeVersionManager(); }, [closeVersionManager]);
  useEffect(() => {
    if (isVersionManagerOpen) {
      document.addEventListener('keydown', handleKeyDown);
      setExpandedId(null);
      setShowCreateForm(false);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVersionManagerOpen, handleKeyDown]);

  // 每个版本的活动数（按日期范围计算）
  const versionEventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    versions.forEach((v) => {
      counts[v.id] = events.filter((e) =>
        e.versionId === v.id || (e.startDate <= v.endDate && e.endDate >= v.startDate)
      ).length;
    });
    return counts;
  }, [versions, events]);

  // 全年时间线参数
  const yearStart = '2026-01-01';
  const yearEnd = '2026-12-31';
  const yearDays = 365;

  if (!isVersionManagerOpen) return null;

  const resetCreateForm = () => {
    setFormData({ name: '', displayName: '', startDate: '', endDate: '', status: 'planning', color: VERSION_COLORS[versions.length % VERSION_COLORS.length], description: '' });
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.displayName.trim() || !formData.startDate || !formData.endDate) return;
    addVersion(formData);
    resetCreateForm();
    setShowCreateForm(false);
  };

  const handleInlineUpdate = (id: string, field: string, value: string) => {
    updateVersion(id, { [field]: value });
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定删除版本「${name}」？\n关联的活动不会被删除，但版本关联会被清除。`)) {
      deleteVersion(id);
      if (expandedId === id) setExpandedId(null);
    }
  };

  const handleJump = (v: typeof versions[0]) => {
    setFilterVersionId(v.id);
    setCurrentDate(parseISO(v.startDate));
    closeVersionManager();
  };

  const handleResetToDefault = () => {
    if (confirm('确定重置版本数据？\n将清除所有自定义版本修改，恢复为TK项目组默认5个版本。\n（活动数据不受影响）')) {
      localStorage.removeItem('gameops-calendar-versions');
      window.location.reload();
    }
  };

  const sortedVersions = [...versions].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-secondary)',
    padding: '0 12px', fontSize: 13, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none',
  };

  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 };

  // 时间线位置计算
  const getTimelinePos = (dateStr: string) => {
    const d = differenceInDays(parseISO(dateStr), parseISO(yearStart));
    return Math.max(0, Math.min(100, (d / yearDays) * 100));
  };

  // 今天位置
  const todayPos = getTimelinePos(format(SIM_TODAY, 'yyyy-MM-dd'));

  return (
    <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)' }} onClick={closeVersionManager} />
      <div className="animate-scale-in" style={{
        position: 'relative', width: 780, maxHeight: '90vh', overflow: 'hidden',
        borderRadius: 16, background: 'var(--bg-surface)', boxShadow: '0 20px 60px rgba(0,0,0,.15)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 头部 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 56, borderBottom: '1px solid var(--border-tertiary)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={20} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>版本管理</h2>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>TK项目组 · {versions.length}个版本</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={handleResetToDefault} title="重置为默认版本" style={{
              height: 32, padding: '0 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
              background: 'transparent', color: 'var(--text-muted)', transition: 'background .12s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            ><RotateCcw size={13} />重置</button>
            <button onClick={closeVersionManager} style={{
              width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', color: 'var(--text-tertiary)',
            }}><X size={20} /></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ====== 全年时间线概览 ====== */}
          <div style={{ marginBottom: 24, padding: '16px 18px', borderRadius: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border-tertiary)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.04em' }}>2026 全年版本时间线</div>
            {/* 月份刻度 */}
            <div style={{ display: 'flex', marginBottom: 6 }}>
              {['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'].map((m, i) => (
                <div key={m} style={{ flex: 1, fontSize: 10, color: 'var(--text-placeholder)', textAlign: 'center', fontWeight: 500 }}>{m}</div>
              ))}
            </div>
            {/* 时间线轨道 */}
            <div style={{ position: 'relative', height: 8 + sortedVersions.length * 22, borderRadius: 4 }}>
              {/* 底色轨道 */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, borderRadius: 4, background: 'var(--bg-tertiary)' }} />
              {/* 今天标记 */}
              <div style={{ position: 'absolute', top: 0, left: `${todayPos}%`, width: 2, height: '100%', background: '#ff3b30', zIndex: 5, borderRadius: 1 }}>
                <span style={{ position: 'absolute', top: -14, left: -10, fontSize: 9, fontWeight: 700, color: '#ff3b30', whiteSpace: 'nowrap' }}>今天</span>
              </div>
              {/* 版本色带 */}
              {sortedVersions.map((v, i) => {
                const left = getTimelinePos(v.startDate);
                const right = getTimelinePos(v.endDate);
                const width = Math.max(1, right - left);
                return (
                  <div key={v.id} style={{
                    position: 'absolute', top: 12 + i * 22, left: `${left}%`, width: `${width}%`, height: 16,
                    borderRadius: 4, background: v.color, opacity: 0.85, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    transition: 'opacity .15s',
                  }}
                    onClick={() => handleJump(v)}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,.3)' }}>{v.displayName}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ====== 版本列表（可展开编辑） ====== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {sortedVersions.map((v) => {
              const stCfg = VERSION_STATUS_CONFIG[v.status];
              const days = differenceInDays(parseISO(v.endDate), parseISO(v.startDate)) + 1;
              const isExpanded = expandedId === v.id;
              const evtCount = versionEventCounts[v.id] || 0;
              const elapsed = Math.max(0, differenceInDays(SIM_TODAY, parseISO(v.startDate)));
              const progressPct = v.status === 'completed' ? 100 : Math.min(100, Math.round((elapsed / days) * 100));

              return (
                <div key={v.id} style={{
                  borderRadius: 14, border: `1px solid ${isExpanded ? v.color + '40' : 'var(--border-tertiary)'}`,
                  background: 'var(--bg-primary)', overflow: 'hidden', transition: 'border-color .2s',
                }}>
                  {/* 版本行 */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer',
                  }}
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  >
                    <div style={{ width: 6, height: 44, borderRadius: 3, background: v.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{v.displayName}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: stCfg.bg, color: stCfg.color }}>{stCfg.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>{evtCount} 个活动</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {format(parseISO(v.startDate), 'MM/dd')} — {format(parseISO(v.endDate), 'MM/dd')}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{days}天</span>
                        {/* 迷你进度条 */}
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progressPct}%`, background: v.color, borderRadius: 2 }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button onClick={(e) => { e.stopPropagation(); handleJump(v); }} title="聚焦此版本" style={{
                        width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', color: 'var(--accent)',
                      }}><Calendar size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(v.id, v.displayName); }} title="删除" style={{
                        width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', color: '#ff3b30',
                      }}><Trash2 size={14} /></button>
                      {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)', marginTop: 8 }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)', marginTop: 8 }} />}
                    </div>
                  </div>

                  {/* 展开编辑区 */}
                  {isExpanded && (
                    <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border-tertiary)' }}>
                      <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={labelStyle}>版本代号</div>
                          <input style={inputStyle} value={v.name}
                            onChange={(e) => handleInlineUpdate(v.id, 'name', e.target.value)} />
                        </div>
                        <div>
                          <div style={labelStyle}>显示名称</div>
                          <input style={inputStyle} value={v.displayName}
                            onChange={(e) => handleInlineUpdate(v.id, 'displayName', e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                        <div>
                          <div style={labelStyle}>开始日期</div>
                          <input type="date" style={inputStyle} value={v.startDate}
                            onChange={(e) => handleInlineUpdate(v.id, 'startDate', e.target.value)} />
                        </div>
                        <div>
                          <div style={labelStyle}>结束日期</div>
                          <input type="date" style={inputStyle} value={v.endDate} min={v.startDate}
                            onChange={(e) => handleInlineUpdate(v.id, 'endDate', e.target.value)} />
                        </div>
                        <div>
                          <div style={labelStyle}>状态</div>
                          <select style={inputStyle} value={v.status}
                            onChange={(e) => handleInlineUpdate(v.id, 'status', e.target.value)}>
                            {STATUSES.map((s) => <option key={s} value={s}>{VERSION_STATUS_CONFIG[s].name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginTop: 12 }}>
                        <div>
                          <div style={labelStyle}>描述</div>
                          <input style={inputStyle} value={v.description || ''}
                            onChange={(e) => handleInlineUpdate(v.id, 'description', e.target.value)}
                            placeholder="版本描述（可选）" />
                        </div>
                        <div>
                          <div style={labelStyle}>颜色</div>
                          <div style={{ display: 'flex', gap: 5, height: 38, alignItems: 'center' }}>
                            {VERSION_COLORS.map((c) => (
                              <button key={c} onClick={() => updateVersion(v.id, { color: c })} style={{
                                width: 24, height: 24, borderRadius: '50%',
                                border: v.color === c ? '3px solid var(--accent)' : '2px solid var(--border-secondary)',
                                background: c, cursor: 'pointer', padding: 0,
                              }} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-placeholder)' }}>
                        修改即时生效 · 活动按日期范围自动匹配版本 · 已过 {Math.max(0, elapsed)} 天 / 共 {days} 天
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ====== 新建版本 ====== */}
          {showCreateForm ? (
            <div style={{
              padding: '18px 18px', borderRadius: 14,
              border: '2px dashed var(--accent)', background: 'color-mix(in srgb, var(--accent) 4%, var(--bg-surface))',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>新建版本</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={labelStyle}>版本代号 *</div>
                  <input style={inputStyle} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="如 260402" />
                </div>
                <div>
                  <div style={labelStyle}>显示名称 *</div>
                  <input style={inputStyle} value={formData.displayName} onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} placeholder="如 V2 · 2026春季版本" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <div style={labelStyle}>开始日期 *</div>
                  <input type="date" style={inputStyle} value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div>
                  <div style={labelStyle}>结束日期 *</div>
                  <input type="date" style={inputStyle} value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} min={formData.startDate || undefined} />
                </div>
                <div>
                  <div style={labelStyle}>状态</div>
                  <select style={inputStyle} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as VersionStatus })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{VERSION_STATUS_CONFIG[s].name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginTop: 12 }}>
                <div>
                  <div style={labelStyle}>描述</div>
                  <input style={inputStyle} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="版本描述（可选）" />
                </div>
                <div>
                  <div style={labelStyle}>颜色</div>
                  <div style={{ display: 'flex', gap: 5, height: 38, alignItems: 'center' }}>
                    {VERSION_COLORS.map((c) => (
                      <button key={c} onClick={() => setFormData({ ...formData, color: c })} style={{
                        width: 24, height: 24, borderRadius: '50%',
                        border: formData.color === c ? '3px solid var(--accent)' : '2px solid var(--border-secondary)',
                        background: c, cursor: 'pointer', padding: 0,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button onClick={() => { setShowCreateForm(false); resetCreateForm(); }} style={{
                  height: 36, padding: '0 16px', borderRadius: 18, fontSize: 13, fontWeight: 500,
                  background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer',
                }}>取消</button>
                <button onClick={handleCreate} style={{
                  height: 36, padding: '0 20px', borderRadius: 18, fontSize: 13, fontWeight: 600,
                  background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}><Plus size={14} />创建</button>
              </div>
            </div>
          ) : (
            <button onClick={() => { setShowCreateForm(true); resetCreateForm(); }} style={{
              width: '100%', height: 48, borderRadius: 14, cursor: 'pointer',
              border: '2px dashed var(--border-secondary)', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', transition: 'all .15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-secondary)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            ><Plus size={16} />添加新版本</button>
          )}
        </div>
      </div>
    </div>
  );
}
