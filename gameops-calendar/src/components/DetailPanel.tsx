import { useEffect, useCallback, useState } from 'react';
import { X, Edit3, Copy, Trash2, Calendar, User, Tag, ArrowRight, MessageSquare, History, Share2, Send, Link2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { CATEGORY_NAMES, CATEGORY_COLORS, SUBTYPE_NAMES, STATUS_CONFIG, PRIORITY_CONFIG, ROLE_CONFIG } from '../constants/index.ts';
import { parseISO, differenceInDays, format } from 'date-fns';

type TabType = 'info' | 'comments' | 'history';

export default function DetailPanel() {
  const { isDetailPanelOpen, selectedEventId, events, closeDetailPanel, openEventModal, duplicateEvent, deleteEvent,
    addComment, getEventComments, getEventChangeLogs, createShareLink, isShareMode, currentUser } = useAppStore();
  const canEdit = !isShareMode && currentUser.permission !== 'viewer';

  const [tab, setTab] = useState<TabType>('info');
  const [commentText, setCommentText] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') closeDetailPanel();
  }, [closeDetailPanel]);

  useEffect(() => {
    if (isDetailPanelOpen) {
      document.addEventListener('keydown', handleKeyDown);
      setTab('info'); setShareUrl(null);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDetailPanelOpen, handleKeyDown]);

  if (!isDetailPanelOpen || !selectedEventId) return null;
  const evt = events.find((e) => e.id === selectedEventId);
  if (!evt) return null;

  const catColor = CATEGORY_COLORS[evt.category];
  const duration = differenceInDays(parseISO(evt.endDate), parseISO(evt.startDate)) + 1;
  const fmtRev = (n?: number) => n == null ? '—' : n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString();
  const comments = getEventComments(evt.id);
  const logs = getEventChangeLogs(evt.id);
  const completionPct = evt.revenueTarget && evt.revenueTarget > 0 && evt.revenueActual != null
    ? Math.round((evt.revenueActual / evt.revenueTarget) * 100) : null;

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment(evt.id, commentText.trim());
    setCommentText('');
  };

  const handleShare = () => {
    const link = createShareLink();
    const url = `${window.location.origin}?share=${link.token}`;
    setShareUrl(url);
    navigator.clipboard?.writeText(url);
  };

  const tabs: { key: TabType; icon: React.ReactNode; label: string; count?: number }[] = [
    { key: 'info', icon: <Calendar size={14} />, label: '详情' },
    { key: 'comments', icon: <MessageSquare size={14} />, label: '评论', count: comments.length },
    { key: 'history', icon: <History size={14} />, label: '变更记录', count: logs.length },
  ];

  /* 工具栏按钮 */
  const ToolBtn = ({ icon: Ic, onClick, title: t }: { icon: typeof X; onClick: () => void; title: string }) => (
    <button onClick={onClick} title={t} style={{
      width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', color: 'var(--text-tertiary)', transition: 'background .12s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    ><Ic size={18} /></button>
  );

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={closeDetailPanel} />
      <div className="animate-slide-right" style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 30,
        width: 520, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-primary)',
        boxShadow: '-8px 0 30px rgba(0,0,0,.08)',
      }}>

        {/* ====== 顶部分类色带 ====== */}
        <div style={{ height: 4, flexShrink: 0, background: catColor }} />

        {/* ====== 工具栏 ====== */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: 52, flexShrink: 0,
          borderBottom: '1px solid var(--border-tertiary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {canEdit && (
              <>
                <ToolBtn icon={Edit3} onClick={() => { closeDetailPanel(); openEventModal(evt); }} title="编辑" />
                <ToolBtn icon={Copy} onClick={() => { duplicateEvent(evt.id); closeDetailPanel(); }} title="复制" />
                <ToolBtn icon={Trash2} onClick={() => { if (confirm(`确定删除「${evt.title}」？`)) { deleteEvent(evt.id); closeDetailPanel(); } }} title="删除" />
              </>
            )}
            <ToolBtn icon={Share2} onClick={handleShare} title="分享" />
          </div>
          <ToolBtn icon={X} onClick={closeDetailPanel} title="关闭" />
        </div>

        {/* 分享链接 */}
        {shareUrl && (
          <div style={{
            margin: '12px 20px 0', padding: '10px 14px', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
            background: 'var(--accent-bg)',
          }}>
            <Link2 size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ color: 'var(--accent)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareUrl}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>已复制</span>
          </div>
        )}

        {/* ====== 标题区 ====== */}
        <div style={{ padding: '20px 24px 16px' }}>
          {/* 分类 + 子类型 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px',
              borderRadius: 5, fontSize: 12, fontWeight: 700, color: catColor,
              background: `color-mix(in srgb, ${catColor} 10%, transparent)`,
            }}>{CATEGORY_NAMES[evt.category]}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{SUBTYPE_NAMES[evt.subType]}</span>
          </div>
          {/* 标题 */}
          <h2 style={{
            fontSize: 22, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em',
            color: 'var(--text-primary)', margin: '0 0 10px',
          }}>{evt.title}</h2>
          {/* 状态 + 优先级 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px',
              borderRadius: 5, fontSize: 12, fontWeight: 600,
              background: STATUS_CONFIG[evt.status].bg, color: STATUS_CONFIG[evt.status].color,
            }}>{STATUS_CONFIG[evt.status].name}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 10px',
              borderRadius: 5, fontSize: 12, fontWeight: 600,
              background: `color-mix(in srgb, ${PRIORITY_CONFIG[evt.priority].color} 10%, transparent)`,
              color: PRIORITY_CONFIG[evt.priority].color,
            }}>{PRIORITY_CONFIG[evt.priority].name}</span>
          </div>
        </div>

        {/* ====== Tab 切换 ====== */}
        <div style={{
          display: 'flex', padding: '0 24px', borderBottom: '1px solid var(--border-tertiary)', flexShrink: 0,
        }}>
          {tabs.map(({ key, icon, label, count }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: 6, height: 42,
              padding: '0 14px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
              background: 'transparent', position: 'relative',
              color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
              transition: 'color .12s',
            }}>
              {icon} {label}
              {count !== undefined && count > 0 && (
                <span style={{ fontSize: 11, opacity: 0.6 }}>({count})</span>
              )}
              {tab === key && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 12, right: 12,
                  height: 2, borderRadius: 1, background: 'var(--accent)',
                }} />
              )}
            </button>
          ))}
        </div>

        {/* ====== Tab 内容区 ====== */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* 详情 Tab */}
          {tab === 'info' && (
            <div>
              {/* 基本信息 */}
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

                  {/* 时间 */}
                  <InfoRow icon={<Calendar size={16} />} label="时间">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{evt.startDate}</span>
                      <ArrowRight size={14} style={{ color: 'var(--text-placeholder)' }} />
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{evt.endDate}</span>
                      <span style={{
                        fontSize: 13, fontWeight: 700, marginLeft: 6, padding: '2px 8px',
                        borderRadius: 5, color: 'var(--accent)', background: 'var(--accent-bg)',
                      }}>{duration}天</span>
                    </div>
                  </InfoRow>

                  {/* 负责人 */}
                  <InfoRow icon={<User size={16} />} label="负责人">
                    {evt.owner ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
                        }}>{evt.owner[0]}</span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{evt.owner}</span>
                      </div>
                    ) : <span style={{ fontSize: 14, color: 'var(--text-placeholder)' }}>未指定</span>}
                  </InfoRow>

                  {/* 标签 */}
                  <InfoRow icon={<Tag size={16} />} label="标签">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {evt.tags.length > 0 ? evt.tags.map((t) => (
                        <span key={t} style={{
                          display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px',
                          borderRadius: 8, fontSize: 13, fontWeight: 500,
                          background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                        }}>{t}</span>
                      )) : <span style={{ fontSize: 14, color: 'var(--text-placeholder)' }}>无</span>}
                    </div>
                  </InfoRow>
                </div>
              </div>

              {/* 协同角色 */}
              <SectionBlock title="协同角色">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {evt.teamRoles.map((r) => (
                    <span key={r} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px',
                      borderRadius: 8, fontSize: 13, fontWeight: 500,
                      background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                    }}>
                      <span style={{ fontSize: 15 }}>{ROLE_CONFIG[r].icon}</span>
                      {ROLE_CONFIG[r].name}
                    </span>
                  ))}
                  {evt.teamRoles.length === 0 && <span style={{ fontSize: 14, color: 'var(--text-placeholder)' }}>无</span>}
                </div>
              </SectionBlock>

              {/* 营收数据 */}
              {(evt.revenueTarget != null || evt.revenueActual != null) && (
                <SectionBlock title="营收数据">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{
                      padding: '16px 18px', borderRadius: 12,
                      background: 'color-mix(in srgb, #ff9f0a 6%, var(--bg-surface))',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>目标</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#ff9f0a' }}>{fmtRev(evt.revenueTarget)}</div>
                    </div>
                    <div style={{
                      padding: '16px 18px', borderRadius: 12,
                      background: 'color-mix(in srgb, #34c759 6%, var(--bg-surface))',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>实际</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: '#34c759' }}>{fmtRev(evt.revenueActual)}</div>
                    </div>
                  </div>
                  {completionPct !== null && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>完成率</span>
                        <span style={{ fontWeight: 700, color: completionPct >= 100 ? '#34c759' : '#ff9f0a' }}>{completionPct}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${Math.min(100, completionPct)}%`,
                          background: completionPct >= 100 ? '#34c759' : 'var(--accent)',
                          transition: 'width .5s ease',
                        }} />
                      </div>
                    </div>
                  )}
                </SectionBlock>
              )}

              {/* 描述 */}
              {evt.description && (
                <SectionBlock title="描述">
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', margin: 0 }}>{evt.description}</p>
                </SectionBlock>
              )}

              {/* 备注 */}
              {evt.notes && (
                <SectionBlock title="备注">
                  <div style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-tertiary)',
                  }}>
                    <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', margin: 0 }}>{evt.notes}</p>
                  </div>
                </SectionBlock>
              )}

              <div style={{ height: 24 }} />
            </div>
          )}

          {/* 评论 Tab */}
          {tab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {comments.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 14, color: 'var(--text-placeholder)' }}>暂无评论，来说点什么吧</div>
                )}
                {comments.map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700,
                    }}>{c.author[0]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.author}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>{format(parseISO(c.createdAt), 'MM-dd HH:mm')}</span>
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              {canEdit && (
                <div style={{
                  padding: '14px 20px', borderTop: '1px solid var(--border-tertiary)',
                  display: 'flex', gap: 10,
                }}>
                  <input
                    value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    placeholder="添加评论..."
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    style={{
                      flex: 1, height: 40, borderRadius: 10, border: '1px solid var(--border-secondary)',
                      padding: '0 14px', fontSize: 14, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                      outline: 'none',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-secondary)'; }}
                  />
                  <button onClick={handleAddComment} disabled={!commentText.trim()} style={{
                    width: 40, height: 40, borderRadius: 10, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--accent)', color: '#fff',
                    opacity: commentText.trim() ? 1 : 0.35, transition: 'opacity .12s',
                  }}>
                    <Send size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 变更记录 Tab */}
          {tab === 'history' && (
            <div style={{ padding: '20px 24px' }}>
              {logs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 14, color: 'var(--text-placeholder)' }}>暂无变更记录</div>
              )}
              {logs.slice().reverse().map((log, idx) => {
                const dotColor = log.action === 'create' ? '#34c759' : log.action === 'delete' ? '#ff3b30' : log.action === 'status_change' ? '#ff9f0a' : log.action === 'comment' ? '#007aff' : '#8e8e93';
                const actionLabel = { create: '创建', update: '编辑', delete: '删除', status_change: '状态变更', comment: '评论' }[log.action] || log.action;
                return (
                  <div key={log.id} style={{ display: 'flex', gap: 14, padding: '14px 0', position: 'relative' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18, flexShrink: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, marginTop: 4, flexShrink: 0 }} />
                      {idx < logs.length - 1 && <div style={{ width: 1, flex: 1, marginTop: 6, background: 'var(--border-secondary)' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{log.author}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                          background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                        }}>{actionLabel}</span>
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 4 }}>{log.detail}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>{format(parseISO(log.timestamp), 'yyyy-MM-dd HH:mm')}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ——— 分区块 ——— */
function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid var(--border-tertiary)' }}>
      <div style={{ padding: '18px 24px' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
          letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 14,
        }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

/* ——— 信息行 ——— */
function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
          letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6,
        }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>{children}</div>
      </div>
    </div>
  );
}
