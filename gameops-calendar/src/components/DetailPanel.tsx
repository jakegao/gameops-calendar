import { useEffect, useCallback, useState, useMemo } from 'react';
import { X, Edit3, Copy, Trash2, Calendar, User, Tag, ArrowRight, MessageSquare, History, Share2, Send, Link2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { CATEGORY_NAMES, CATEGORY_COLORS, SUBTYPE_NAMES, STATUS_CONFIG, PRIORITY_CONFIG, ROLE_CONFIG } from '../constants/index.ts';
import { parseISO, differenceInDays, format } from 'date-fns';

type TabType = 'info' | 'comments' | 'history';

export default function DetailPanel() {
  const { isDetailPanelOpen, selectedEventId, events, closeDetailPanel, openEventModal, duplicateEvent, deleteEvent,
    addComment, getEventComments, getEventChangeLogs, createShareLink, isShareMode } = useAppStore();

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
  // B10: 区分 0 和 undefined/null
  const fmtRev = (n?: number) => n == null ? '—' : n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString();
  const comments = getEventComments(evt.id);
  const logs = getEventChangeLogs(evt.id);

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
    { key: 'info', icon: <Calendar size={15} />, label: '详情' },
    { key: 'comments', icon: <MessageSquare size={15} />, label: '评论', count: comments.length },
    { key: 'history', icon: <History size={15} />, label: '变更记录', count: logs.length },
  ];

  return (
    <>
      <div className="absolute inset-0 z-20" onClick={closeDetailPanel} />
      <div className="absolute right-0 top-0 bottom-0 w-[500px] border-l z-30 flex flex-col animate-slide-right"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-primary)', boxShadow: '-4px 0 12px rgba(0,0,0,.12)' }}>
        <div className="h-2 flex-shrink-0" style={{ backgroundColor: catColor }} />

        {/* 工具栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-1">
            {!isShareMode && [
              { icon: Edit3, fn: () => { closeDetailPanel(); openEventModal(evt); }, label: '编辑' },
              { icon: Copy, fn: () => { duplicateEvent(evt.id); closeDetailPanel(); }, label: '复制' },
              { icon: Trash2, fn: () => { if (confirm(`确定删除「${evt.title}」？`)) { deleteEvent(evt.id); closeDetailPanel(); } }, label: '删除' },
            ].map(({ icon: Ic, fn, label }) => (
              <button key={label} onClick={fn} title={label}
                className="w-9 h-9 rounded-full flex items-center justify-center t-bg-hover transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                <Ic size={16} />
              </button>
            ))}
            <button onClick={handleShare} title="生成分享链接"
              className="w-9 h-9 rounded-full flex items-center justify-center t-bg-hover transition-colors" style={{ color: 'var(--text-tertiary)' }}>
              <Share2 size={16} />
            </button>
          </div>
          <button onClick={closeDetailPanel} className="w-9 h-9 rounded-full flex items-center justify-center t-bg-hover transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* 分享链接提示 */}
        {shareUrl && (
          <div className="mx-5 mt-3 p-3 rounded-lg flex items-center gap-2 text-[13px] animate-fade-in" style={{ background: 'var(--accent-bg)' }}>
            <Link2 size={14} style={{ color: 'var(--accent)' }} />
            <span className="truncate flex-1" style={{ color: 'var(--accent)' }}>{shareUrl}</span>
            <span className="text-[12px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>已复制</span>
          </div>
        )}

        {/* 标题区 */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge" style={{ backgroundColor: `${catColor}18`, color: catColor }}>{CATEGORY_NAMES[evt.category]}</span>
            <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>{SUBTYPE_NAMES[evt.subType]}</span>
          </div>
          <h2 className="text-[22px] leading-snug mb-3" style={{ color: 'var(--text-primary)' }}>{evt.title}</h2>
          <div className="flex gap-2">
            <span className="badge" style={{ backgroundColor: STATUS_CONFIG[evt.status].bg, color: STATUS_CONFIG[evt.status].color }}>{STATUS_CONFIG[evt.status].name}</span>
            <span className="badge" style={{ backgroundColor: `${PRIORITY_CONFIG[evt.priority].color}12`, color: PRIORITY_CONFIG[evt.priority].color }}>{PRIORITY_CONFIG[evt.priority].name}</span>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b px-4" style={{ borderColor: 'var(--border-primary)' }}>
          {tabs.map(({ key, icon, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors relative"
              style={{ color: tab === key ? 'var(--accent)' : 'var(--text-muted)' }}>
              {icon} {label}
              {count !== undefined && count > 0 && <span className="text-[11px] ml-0.5 opacity-70">({count})</span>}
              {tab === key && <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: 'var(--accent)' }} />}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'info' && (
            <div>
              <div className="px-6 py-6 space-y-5">
                <Row icon={<Calendar size={18} />} label="时间">
                  <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>{evt.startDate}</span>
                  <ArrowRight size={14} className="mx-2" style={{ color: 'var(--text-placeholder)' }} />
                  <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>{evt.endDate}</span>
                  <span className="text-[13px] ml-2 font-medium" style={{ color: 'var(--accent)' }}>{duration}天</span>
                </Row>
                <Row icon={<User size={18} />} label="负责人">
                  {evt.owner ? (
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#1a73e8] text-white text-[12px] font-medium flex items-center justify-center">{evt.owner[0]}</span>
                      <span className="text-[14px]" style={{ color: 'var(--text-primary)' }}>{evt.owner}</span>
                    </div>
                  ) : <span style={{ color: 'var(--text-placeholder)' }}>未指定</span>}
                </Row>
                <Row icon={<Tag size={18} />} label="标签">
                  <div className="flex flex-wrap gap-1.5">
                    {evt.tags.length > 0 ? evt.tags.map((t) => (
                      <span key={t} className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{t}</span>
                    )) : <span style={{ color: 'var(--text-placeholder)' }}>无</span>}
                  </div>
                </Row>
              </div>
              {/* 协同角色 */}
              <div className="px-6 py-5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="text-[12px] font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>协同角色</div>
                <div className="flex flex-wrap gap-1.5">
                  {evt.teamRoles.map((r) => (
                    <span key={r} className="badge text-[12px] gap-1" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{ROLE_CONFIG[r].icon} {ROLE_CONFIG[r].name}</span>
                  ))}
                </div>
              </div>
              {/* 营收 — P1-1: 改用 != null 判断 */}
              {(evt.revenueTarget != null || evt.revenueActual != null) && (
                <div className="px-6 py-5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-[12px] font-medium mb-3" style={{ color: 'var(--text-tertiary)' }}>营收数据</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-4" style={{ background: 'color-mix(in srgb, #e37400 8%, var(--bg-surface))' }}><div className="text-[12px] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>目标</div><div className="text-[18px] font-medium text-[#e37400]">{fmtRev(evt.revenueTarget)}</div></div>
                    <div className="rounded-xl p-4" style={{ background: 'color-mix(in srgb, #0d652d 8%, var(--bg-surface))' }}><div className="text-[12px] mb-0.5" style={{ color: 'var(--text-tertiary)' }}>实际</div><div className="text-[18px] font-medium text-[#0d652d]">{fmtRev(evt.revenueActual)}</div></div>
                  </div>
                  {evt.revenueTarget != null && evt.revenueTarget > 0 && evt.revenueActual != null && (
                    <div className="mt-4">
                      <div className="flex justify-between text-[13px] mb-1.5">
                        <span style={{ color: 'var(--text-tertiary)' }}>完成率</span>
                        <span className="font-medium" style={{ color: evt.revenueActual >= evt.revenueTarget ? '#0d652d' : '#e37400' }}>
                          {((evt.revenueActual / evt.revenueTarget) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border-primary)' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (evt.revenueActual / evt.revenueTarget) * 100)}%`, backgroundColor: evt.revenueActual >= evt.revenueTarget ? '#0d652d' : '#1a73e8' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* 描述 & 备注 — P1-3: 备注区CSS变量化 */}
              {(evt.description || evt.notes) && (
                <div className="px-6 py-5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  {evt.description && (<div className="mb-4"><div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>描述</div><p className="text-[14px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>{evt.description}</p></div>)}
                  {evt.notes && (<div><div className="text-[12px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>备注</div><p className="text-[14px] leading-[1.7] p-4 rounded-xl" style={{ background: 'color-mix(in srgb, #e37400 6%, var(--bg-surface))', color: 'var(--text-tertiary)' }}>{evt.notes}</p></div>)}
                </div>
              )}
            </div>
          )}

          {/* 评论 Tab */}
          {tab === 'comments' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {comments.length === 0 && <div className="text-center py-12 text-[14px]" style={{ color: 'var(--text-placeholder)' }}>暂无评论，来说点什么吧</div>}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#1a73e8] text-white text-[12px] font-medium flex items-center justify-center flex-shrink-0">{c.author[0]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{c.author}</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-placeholder)' }}>{format(parseISO(c.createdAt), 'MM-dd HH:mm')}</span>
                      </div>
                      <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              {!isShareMode && (
                <div className="px-5 py-4 border-t flex gap-2" style={{ borderColor: 'var(--border-primary)' }}>
                  <input className="input flex-1 text-[13px] !py-2.5" value={commentText}
                    onChange={(e) => setCommentText(e.target.value)} placeholder="添加评论..."
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} />
                  <button onClick={handleAddComment} disabled={!commentText.trim()}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
                    style={{ background: 'var(--accent)', color: '#fff' }}>
                    <Send size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 变更记录 Tab */}
          {tab === 'history' && (
            <div className="px-6 py-4">
              {logs.length === 0 && <div className="text-center py-12 text-[14px]" style={{ color: 'var(--text-placeholder)' }}>暂无变更记录</div>}
              <div className="space-y-0">
                {logs.slice().reverse().map((log, idx) => (
                  <div key={log.id} className="flex gap-3 py-3 relative">
                    {/* 时间线 */}
                    <div className="flex flex-col items-center flex-shrink-0 w-5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{
                        background: log.action === 'create' ? '#34a853' : log.action === 'delete' ? '#ea4335' : log.action === 'status_change' ? '#fbbc04' : log.action === 'comment' ? '#4285f4' : '#9aa0a6',
                      }} />
                      {idx < logs.length - 1 && <div className="w-px flex-1 mt-1" style={{ background: 'var(--border-secondary)' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>{log.author}</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-placeholder)' }}>
                          {{ create: '创建', update: '编辑', delete: '删除', status_change: '状态变更', comment: '评论' }[log.action]}
                        </span>
                      </div>
                      <div className="text-[13px]" style={{ color: 'var(--text-muted)' }}>{log.detail}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-placeholder)' }}>{format(parseISO(log.timestamp), 'yyyy-MM-dd HH:mm')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{icon}</div>
      <div>
        <div className="text-[12px] mb-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
        <div className="flex items-center flex-wrap">{children}</div>
      </div>
    </div>
  );
}
