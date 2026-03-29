import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { CATEGORY_NAMES, SUBTYPE_NAMES, STATUS_CONFIG, PRIORITY_CONFIG, ROLE_CONFIG, CATEGORY_COLORS, SUBTYPE_CATEGORY } from '../constants/index.ts';
import type { EventCategory, EventSubType, EventStatus, Priority, TeamRole } from '../types/index.ts';

const CATEGORIES = Object.keys(CATEGORY_NAMES) as EventCategory[];
const STATUSES = Object.keys(STATUS_CONFIG) as EventStatus[];
const PRIORITIES = Object.keys(PRIORITY_CONFIG) as Priority[];
const ROLES = Object.keys(ROLE_CONFIG) as TeamRole[];
function getSubTypes(cat: EventCategory): EventSubType[] {
  return (Object.keys(SUBTYPE_CATEGORY) as EventSubType[]).filter((st) => SUBTYPE_CATEGORY[st] === cat);
}

/* 通用输入框样式 */
const inputStyle: React.CSSProperties = {
  width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border-secondary)',
  padding: '0 14px', fontSize: 14, background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
  outline: 'none', transition: 'border-color .12s, box-shadow .12s',
};
const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = 'var(--accent)';
  e.currentTarget.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent)';
};
const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = 'var(--border-secondary)';
  e.currentTarget.style.boxShadow = 'none';
};
const inputErrStyle: React.CSSProperties = { ...inputStyle, borderColor: '#ff3b30' };

export default function EventModal() {
  const { isEventModalOpen, editingEvent, closeEventModal, addEvent, updateEvent, defaultStartDate } = useAppStore();
  const events = useAppStore((s) => s.events);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>('paid');
  const [subType, setSubType] = useState<EventSubType>('limited_pack');
  const [priority, setPriority] = useState<Priority>('P1');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [owner, setOwner] = useState('');
  const [teamRoles, setTeamRoles] = useState<TeamRole[]>([]);
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [revenueTarget, setRevenueTarget] = useState('');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title); setDescription(editingEvent.description); setCategory(editingEvent.category);
      setSubType(editingEvent.subType); setPriority(editingEvent.priority); setStatus(editingEvent.status);
      setStartDate(editingEvent.startDate); setEndDate(editingEvent.endDate); setOwner(editingEvent.owner);
      setTeamRoles([...editingEvent.teamRoles]); setTags(editingEvent.tags.join(', '));
      setNotes(editingEvent.notes); setRevenueTarget(editingEvent.revenueTarget?.toString() ?? '');
      setDependencies([...editingEvent.dependencies]);
    } else {
      setTitle(''); setDescription(''); setCategory('paid'); setSubType('limited_pack');
      setPriority('P1'); setStatus('draft');
      setStartDate(defaultStartDate || ''); setEndDate(defaultStartDate || '');
      setOwner(''); setTeamRoles([]); setTags(''); setNotes(''); setRevenueTarget('');
      setDependencies([]);
    }
    setSubmitted(false); setConflictWarning(null);
  }, [editingEvent, isEventModalOpen, defaultStartDate]);

  useEffect(() => { if (startDate && endDate && endDate < startDate) setEndDate(startDate); }, [startDate]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') closeEventModal(); }, [closeEventModal]);
  useEffect(() => {
    if (isEventModalOpen) { document.addEventListener('keydown', handleKeyDown); return () => document.removeEventListener('keydown', handleKeyDown); }
  }, [isEventModalOpen, handleKeyDown]);

  if (!isEventModalOpen) return null;

  const toggleRole = (r: TeamRole) => setTeamRoles((p) => p.includes(r) ? p.filter((x) => x !== r) : [...p, r]);

  const errors = {
    title: !title.trim() ? '请输入活动名称' : '',
    startDate: !startDate ? '请选择开始日期' : '',
    endDate: !endDate ? '请选择结束日期' : (startDate && endDate < startDate) ? '结束日期不能早于开始日期' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleSave = () => {
    setSubmitted(true);
    if (hasErrors) return;
    if (startDate && endDate) {
      const overlapping = events.filter((e) => {
        if (editingEvent && e.id === editingEvent.id) return false;
        if (e.category !== category || e.subType !== subType) return false;
        if (e.status === 'cancelled' || e.status === 'completed') return false;
        return e.startDate <= endDate && e.endDate >= startDate;
      });
      if (overlapping.length > 0 && !conflictWarning) {
        setConflictWarning(`与「${overlapping.map((e) => e.title).join('」「')}」时间重叠，确认继续？`);
        return;
      }
    }
    const data = {
      title: title.trim(), description, category, subType, priority, status, startDate, endDate,
      color: CATEGORY_COLORS[category], owner, teamRoles,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      dependencies, notes,
      revenueTarget: revenueTarget ? Math.max(0, Number(revenueTarget)) : undefined,
      revenueActual: editingEvent?.revenueActual,
    };
    editingEvent ? updateEvent(editingEvent.id, data) : addEvent(data);
    closeEventModal();
  };

  const Label = ({ text, required }: { text: string; required?: boolean }) => (
    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
      {text}{required && <span style={{ color: '#ff3b30', marginLeft: 3 }}>*</span>}
    </div>
  );

  const ErrMsg = ({ msg }: { msg: string }) => msg ? (
    <div style={{ fontSize: 12, color: '#ff3b30', marginTop: 6 }}>{msg}</div>
  ) : null;

  return (
    <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)' }} onClick={closeEventModal} />
      <div className="animate-scale-in" style={{
        position: 'relative', width: 640, maxHeight: '88vh', overflow: 'hidden',
        borderRadius: 16, background: 'var(--bg-surface)', boxShadow: '0 20px 60px rgba(0,0,0,.15)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 头部 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 56, borderBottom: '1px solid var(--border-tertiary)', flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {editingEvent ? '编辑活动' : '新建活动'}
          </h2>
          <button onClick={closeEventModal} style={{
            width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: 'var(--text-tertiary)', transition: 'background .12s',
          }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <X size={20} />
          </button>
        </div>

        {/* 表单 */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          {/* 名称 */}
          <div>
            <Label text="活动名称" required />
            <input style={submitted && errors.title ? inputErrStyle : inputStyle} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="例：五一黄金周限时礼包" onFocus={inputFocus} onBlur={inputBlur} />
            {submitted && <ErrMsg msg={errors.title} />}
          </div>

          {/* 类型 + 子类型 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <Label text="活动类型" required />
              <select style={inputStyle} value={category} onChange={(e) => { const c = e.target.value as EventCategory; setCategory(c); setSubType(getSubTypes(c)[0]); }}
                onFocus={inputFocus as any} onBlur={inputBlur as any}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_NAMES[c]}</option>)}
              </select>
            </div>
            <div>
              <Label text="子类型" />
              <select style={inputStyle} value={subType} onChange={(e) => setSubType(e.target.value as EventSubType)}
                onFocus={inputFocus as any} onBlur={inputBlur as any}>
                {getSubTypes(category).map((st) => <option key={st} value={st}>{SUBTYPE_NAMES[st]}</option>)}
              </select>
            </div>
          </div>

          {/* 优先级 + 状态 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <Label text="优先级" />
              <select style={inputStyle} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}
                onFocus={inputFocus as any} onBlur={inputBlur as any}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_CONFIG[p].name}</option>)}
              </select>
            </div>
            <div>
              <Label text="状态" />
              <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}
                onFocus={inputFocus as any} onBlur={inputBlur as any}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].name}</option>)}
              </select>
            </div>
          </div>

          {/* 日期 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <Label text="开始日期" required />
              <input type="date" style={submitted && errors.startDate ? inputErrStyle : inputStyle}
                value={startDate} onChange={(e) => setStartDate(e.target.value)} onFocus={inputFocus} onBlur={inputBlur} />
              {submitted && <ErrMsg msg={errors.startDate} />}
            </div>
            <div>
              <Label text="结束日期" required />
              <input type="date" style={submitted && errors.endDate ? inputErrStyle : inputStyle}
                value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate || undefined} onFocus={inputFocus} onBlur={inputBlur} />
              {submitted && <ErrMsg msg={errors.endDate} />}
            </div>
          </div>

          {/* 负责人 + 营收 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <Label text="负责人" />
              <input style={inputStyle} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="姓名" onFocus={inputFocus} onBlur={inputBlur} />
            </div>
            <div>
              <Label text="营收目标" />
              <input type="number" min="0" step="1" style={inputStyle} value={revenueTarget}
                onChange={(e) => setRevenueTarget(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-') e.preventDefault(); }}
                placeholder="单位：元" onFocus={inputFocus} onBlur={inputBlur} />
            </div>
          </div>

          {/* 协同角色 */}
          <div>
            <Label text="协同角色" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ROLES.map((r) => {
                const active = teamRoles.includes(r);
                return (
                  <button key={r} onClick={() => toggleRole(r)} style={{
                    height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13, fontWeight: 500,
                    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border-secondary)'}`,
                    background: active ? 'var(--accent-bg)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all .12s',
                  }}>{ROLE_CONFIG[r].icon} {ROLE_CONFIG[r].name}</button>
                );
              })}
            </div>
          </div>

          {/* 标签 */}
          <div>
            <Label text="标签（逗号分隔）" />
            <input style={inputStyle} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="春节, 限时, 高营收" onFocus={inputFocus} onBlur={inputBlur} />
          </div>

          {/* 依赖 */}
          <div>
            <Label text="前置依赖活动" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 110, overflowY: 'auto' }}>
              {events.filter((e) => !editingEvent || e.id !== editingEvent.id).map((e) => {
                const active = dependencies.includes(e.id);
                return (
                  <button key={e.id} type="button"
                    onClick={() => setDependencies((prev) => active ? prev.filter((d) => d !== e.id) : [...prev, e.id])}
                    style={{
                      height: 32, padding: '0 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border-secondary)'}`,
                      background: active ? 'var(--accent-bg)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      transition: 'all .12s',
                    }}>{e.title}</button>
                );
              })}
              {events.filter((e) => !editingEvent || e.id !== editingEvent.id).length === 0 && (
                <span style={{ fontSize: 13, color: 'var(--text-placeholder)' }}>暂无其他活动可选</span>
              )}
            </div>
          </div>

          {/* 描述 */}
          <div>
            <Label text="描述" />
            <textarea style={{ ...inputStyle, height: 80, padding: '10px 14px', resize: 'none' }} value={description}
              onChange={(e) => setDescription(e.target.value)} placeholder="活动详情..."
              onFocus={inputFocus as any} onBlur={inputBlur as any} />
          </div>

          {/* 备注 */}
          <div>
            <Label text="备注" />
            <textarea style={{ ...inputStyle, height: 68, padding: '10px 14px', resize: 'none' }} value={notes}
              onChange={(e) => setNotes(e.target.value)} placeholder="内部备注..."
              onFocus={inputFocus as any} onBlur={inputBlur as any} />
          </div>
        </div>

        {/* 冲突警告 */}
        {conflictWarning && (
          <div style={{
            margin: '0 24px 12px', padding: '12px 16px', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'color-mix(in srgb, #ff3b30 8%, var(--bg-surface))',
            border: '1px solid color-mix(in srgb, #ff3b30 15%, transparent)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: '#ff3b30' }}>{conflictWarning}</span>
            <button onClick={() => { setConflictWarning('confirmed'); handleSave(); }} style={{
              height: 32, padding: '0 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: '#ff3b30', color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0,
            }}>仍然创建</button>
            <button onClick={() => setConflictWarning(null)} style={{
              height: 32, padding: '0 10px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', flexShrink: 0,
            }}>取消</button>
          </div>
        )}

        {/* 底部 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', borderTop: '1px solid var(--border-tertiary)', flexShrink: 0,
        }}>
          {submitted && hasErrors ? (
            <span style={{ fontSize: 13, color: '#ff3b30' }}>请填写所有必填字段</span>
          ) : <span />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={closeEventModal} style={{
              height: 40, padding: '0 20px', borderRadius: 20, fontSize: 14, fontWeight: 500,
              background: 'transparent', color: 'var(--accent)', border: 'none', cursor: 'pointer',
              transition: 'background .12s',
            }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>取消</button>
            <button onClick={handleSave} style={{
              height: 40, padding: '0 24px', borderRadius: 20, fontSize: 14, fontWeight: 600,
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(59,130,246,.25)', transition: 'transform .1s, box-shadow .15s',
            }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,.35)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,.25)'; }}>
              {editingEvent ? '保存修改' : '创建活动'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
