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

export default function EventModal() {
  const { isEventModalOpen, editingEvent, closeEventModal, addEvent, updateEvent, defaultStartDate } = useAppStore();
  const events = useAppStore((s) => s.events);
  const detectConflicts = useAppStore((s) => s.detectConflicts);
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

  // 校验状态
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
      // B3: 从 store.defaultStartDate 获取双击传入的日期
      setStartDate(defaultStartDate || '');
      setEndDate(defaultStartDate || '');
      setOwner(''); setTeamRoles([]); setTags(''); setNotes(''); setRevenueTarget('');
      setDependencies([]);
    }
    setSubmitted(false);
    setConflictWarning(null);
  }, [editingEvent, isEventModalOpen, defaultStartDate]);

  // 当 startDate 变化时，如果 endDate 早于 startDate，自动修正
  useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      setEndDate(startDate);
    }
  }, [startDate]);

  // ESC 关闭弹窗
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') closeEventModal();
  }, [closeEventModal]);

  useEffect(() => {
    if (isEventModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEventModalOpen, handleKeyDown]);

  if (!isEventModalOpen) return null;

  const toggleRole = (r: TeamRole) => setTeamRoles((p) => p.includes(r) ? p.filter((x) => x !== r) : [...p, r]);

  // 校验逻辑
  const errors = {
    title: !title.trim() ? '请输入活动名称' : '',
    startDate: !startDate ? '请选择开始日期' : '',
    endDate: !endDate ? '请选择结束日期' : (startDate && endDate < startDate) ? '结束日期不能早于开始日期' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const handleSave = () => {
    setSubmitted(true);
    if (hasErrors) return;

    // 冲突检测：检查同类型活动时间重叠
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
      // B13: 营收目标过滤负数
      revenueTarget: revenueTarget ? Math.max(0, Number(revenueTarget)) : undefined,
      revenueActual: editingEvent?.revenueActual,
    };
    editingEvent ? updateEvent(editingEvent.id, data) : addEvent(data);
    closeEventModal();
  };

  const lbl = "text-[13px] font-medium mb-2";
  const lblStyle = { color: 'var(--text-tertiary)' };
  const errCls = "text-[12px] text-[#ff3b30] mt-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/25" onClick={closeEventModal} />
      <div className="relative overflow-hidden rounded-2xl animate-scale-in"
        style={{ width: 680, maxHeight: '88vh', background: 'var(--bg-surface)', boxShadow: 'var(--shadow-modal)' }}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <h2 className="text-[20px]" style={{ color: 'var(--text-primary)' }}>{editingEvent ? '编辑活动' : '新建活动'}</h2>
          <button onClick={closeEventModal} className="w-11 h-11 rounded-full flex items-center justify-center t-bg-hover transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <X size={22} />
          </button>
        </div>

        {/* 表单 */}
        <div className="px-8 py-6 space-y-6 overflow-y-auto max-h-[calc(88vh-148px)]">
          {/* 活动名称 */}
          <div>
            <div className={lbl} style={lblStyle}>活动名称 <span className="text-[#ff3b30]">*</span></div>
            <input
              className={`input text-[16px] ${submitted && errors.title ? 'border-[#ff3b30] focus:border-[#ff3b30] focus:ring-[#ff3b30]/20' : ''}`}
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="例：五一黄金周限时礼包"
            />
            {submitted && errors.title && <div className={errCls}>{errors.title}</div>}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className={lbl} style={lblStyle}>活动类型 <span className="text-[#ff3b30]">*</span></div>
              <select className="input" value={category} onChange={(e) => { const c = e.target.value as EventCategory; setCategory(c); setSubType(getSubTypes(c)[0]); }}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_NAMES[c]}</option>)}
              </select>
            </div>
            <div>
              <div className={lbl} style={lblStyle}>子类型</div>
              <select className="input" value={subType} onChange={(e) => setSubType(e.target.value as EventSubType)}>
                {getSubTypes(category).map((st) => <option key={st} value={st}>{SUBTYPE_NAMES[st]}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className={lbl} style={lblStyle}>优先级</div>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_CONFIG[p].name}</option>)}
              </select>
            </div>
            <div>
              <div className={lbl} style={lblStyle}>状态</div>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].name}</option>)}
              </select>
            </div>
          </div>

          {/* 日期 */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className={lbl} style={lblStyle}>开始日期 <span className="text-[#ff3b30]">*</span></div>
              <input
                type="date" className={`input ${submitted && errors.startDate ? 'border-[#ff3b30] focus:border-[#ff3b30] focus:ring-[#ff3b30]/20' : ''}`}
                value={startDate} onChange={(e) => setStartDate(e.target.value)}
              />
              {submitted && errors.startDate && <div className={errCls}>{errors.startDate}</div>}
            </div>
            <div>
              <div className={lbl} style={lblStyle}>结束日期 <span className="text-[#ff3b30]">*</span></div>
              <input
                type="date" className={`input ${submitted && errors.endDate ? 'border-[#ff3b30] focus:border-[#ff3b30] focus:ring-[#ff3b30]/20' : ''}`}
                value={endDate} onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
              {submitted && errors.endDate && <div className={errCls}>{errors.endDate}</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className={lbl} style={lblStyle}>负责人</div>
              <input className="input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="姓名" />
            </div>
            <div>
              {/* B13: 营收目标限制最小值为0，不允许负数 */}
              <div className={lbl} style={lblStyle}>营收目标</div>
              <input type="number" min="0" step="1" className="input" value={revenueTarget}
                onChange={(e) => setRevenueTarget(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'e' || e.key === 'E' || e.key === '-') e.preventDefault(); }}
                placeholder="单位：元" />
            </div>
          </div>

          <div>
            <div className={lbl} style={lblStyle}>协同角色</div>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button key={r} onClick={() => toggleRole(r)}
                  className={`h-10 px-4 rounded-full text-[14px] font-medium border transition-all ${
                    teamRoles.includes(r) ? '' : 'hover:opacity-80'
                  }`}
                  style={{
                    background: teamRoles.includes(r) ? 'var(--accent-bg)' : 'var(--bg-surface)',
                    borderColor: teamRoles.includes(r) ? 'var(--accent)' : 'var(--border-secondary)',
                    color: teamRoles.includes(r) ? 'var(--text-active)' : 'var(--text-tertiary)',
                  }}>
                  {ROLE_CONFIG[r].icon} {ROLE_CONFIG[r].name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className={lbl} style={lblStyle}>标签（逗号分隔）</div>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="春节, 限时, 高营收" />
          </div>

          {/* 依赖关系选择 */}
          <div>
            <div className={lbl} style={lblStyle}>前置依赖活动</div>
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-auto">
              {events.filter((e) => !editingEvent || e.id !== editingEvent.id).map((e) => (
                <button key={e.id} type="button"
                  onClick={() => setDependencies((prev) => prev.includes(e.id) ? prev.filter((d) => d !== e.id) : [...prev, e.id])}
                  className={`h-9 px-3 rounded-lg text-[13px] font-medium border transition-all truncate max-w-[200px] ${
                    dependencies.includes(e.id) ? '' : 'hover:opacity-80'
                  }`}
                  style={{
                    background: dependencies.includes(e.id) ? 'var(--accent-bg)' : 'var(--bg-surface)',
                    borderColor: dependencies.includes(e.id) ? 'var(--accent)' : 'var(--border-secondary)',
                    color: dependencies.includes(e.id) ? 'var(--text-active)' : 'var(--text-tertiary)',
                  }}>
                  {e.title}
                </button>
              ))}
              {events.filter((e) => !editingEvent || e.id !== editingEvent.id).length === 0 && (
                <span className="text-[13px]" style={{ color: 'var(--text-placeholder)' }}>暂无其他活动可选</span>
              )}
            </div>
          </div>

          <div>
            <div className={lbl} style={lblStyle}>描述</div>
            <textarea className="input h-24 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="活动详情..." />
          </div>

          <div>
            <div className={lbl} style={lblStyle}>备注</div>
            <textarea className="input h-20 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="内部备注..." />
          </div>
        </div>

        {/* 冲突警告 */}
        {conflictWarning && (
          <div className="mx-8 mb-2 p-4 rounded-xl flex items-center gap-3 animate-fade-in"
            style={{ background: 'color-mix(in srgb, #ff3b30 8%, var(--bg-surface))', border: '1px solid color-mix(in srgb, #ff3b30 15%, transparent)' }}>
            <span className="text-[13px] font-medium flex-1" style={{ color: '#ff3b30' }}>{conflictWarning}</span>
            <button onClick={() => { setConflictWarning('confirmed'); handleSave(); }}
              className="h-9 px-4 rounded-lg text-[13px] font-semibold flex-shrink-0"
              style={{ background: '#ff3b30', color: '#fff' }}>仍然创建</button>
            <button onClick={() => setConflictWarning(null)}
              className="h-9 px-3 rounded-lg text-[13px] font-medium flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}>取消</button>
          </div>
        )}

        {/* 底部 */}
        <div className="flex items-center justify-between px-8 py-5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          {submitted && hasErrors ? (
            <span className="text-[13px] text-[#ff3b30]">请填写所有必填字段</span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <button onClick={closeEventModal}
              className="h-11 px-6 rounded-full text-[14px] font-medium transition-colors" style={{ color: 'var(--accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              取消
            </button>
            <button onClick={handleSave}
              className="btn-primary h-11 px-7">
              {editingEvent ? '保存修改' : '创建活动'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
