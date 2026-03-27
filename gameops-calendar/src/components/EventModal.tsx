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

  // 校验状态
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title); setDescription(editingEvent.description); setCategory(editingEvent.category);
      setSubType(editingEvent.subType); setPriority(editingEvent.priority); setStatus(editingEvent.status);
      setStartDate(editingEvent.startDate); setEndDate(editingEvent.endDate); setOwner(editingEvent.owner);
      setTeamRoles([...editingEvent.teamRoles]); setTags(editingEvent.tags.join(', '));
      setNotes(editingEvent.notes); setRevenueTarget(editingEvent.revenueTarget?.toString() ?? '');
    } else {
      setTitle(''); setDescription(''); setCategory('paid'); setSubType('limited_pack');
      setPriority('P1'); setStatus('draft');
      // B3: 从 store.defaultStartDate 获取双击传入的日期
      setStartDate(defaultStartDate || '');
      setEndDate(defaultStartDate || '');
      setOwner(''); setTeamRoles([]); setTags(''); setNotes(''); setRevenueTarget('');
    }
    setSubmitted(false);
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

    const data = {
      title: title.trim(), description, category, subType, priority, status, startDate, endDate,
      color: CATEGORY_COLORS[category], owner, teamRoles,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      dependencies: editingEvent?.dependencies ?? [], notes,
      // B13: 营收目标过滤负数
      revenueTarget: revenueTarget ? Math.max(0, Number(revenueTarget)) : undefined,
      revenueActual: editingEvent?.revenueActual,
    };
    editingEvent ? updateEvent(editingEvent.id, data) : addEvent(data);
    closeEventModal();
  };

  const lbl = "text-[13px] font-medium mb-2";
  const lblStyle = { color: 'var(--text-tertiary)' };
  const errCls = "text-[12px] text-[#d93025] mt-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/25" onClick={closeEventModal} />
      <div className="relative w-[680px] max-h-[88vh] overflow-hidden rounded-2xl animate-scale-in"
        style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-modal)' }}>
        {/* 头部 */}
        <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <h2 className="text-[20px]" style={{ color: 'var(--text-primary)' }}>{editingEvent ? '编辑活动' : '新建活动'}</h2>
          <button onClick={closeEventModal} className="w-10 h-10 rounded-full flex items-center justify-center t-bg-hover transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <X size={22} />
          </button>
        </div>

        {/* 表单 */}
        <div className="px-8 py-6 space-y-6 overflow-y-auto max-h-[calc(88vh-148px)]">
          {/* 活动名称 */}
          <div>
            <div className={lbl} style={lblStyle}>活动名称 <span className="text-[#d93025]">*</span></div>
            <input
              className={`input text-[16px] ${submitted && errors.title ? 'border-[#d93025] focus:border-[#d93025] focus:ring-[#d93025]/20' : ''}`}
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="例：五一黄金周限时礼包"
            />
            {submitted && errors.title && <div className={errCls}>{errors.title}</div>}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <div className={lbl} style={lblStyle}>活动类型 <span className="text-[#d93025]">*</span></div>
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
              <div className={lbl} style={lblStyle}>开始日期 <span className="text-[#d93025]">*</span></div>
              <input
                type="date" className={`input ${submitted && errors.startDate ? 'border-[#d93025] focus:border-[#d93025] focus:ring-[#d93025]/20' : ''}`}
                value={startDate} onChange={(e) => setStartDate(e.target.value)}
              />
              {submitted && errors.startDate && <div className={errCls}>{errors.startDate}</div>}
            </div>
            <div>
              <div className={lbl} style={lblStyle}>结束日期 <span className="text-[#d93025]">*</span></div>
              <input
                type="date" className={`input ${submitted && errors.endDate ? 'border-[#d93025] focus:border-[#d93025] focus:ring-[#d93025]/20' : ''}`}
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
                  className={`h-9 px-4 rounded-full text-[14px] font-medium border transition-all ${
                    teamRoles.includes(r)
                      ? 'border-[#1a73e8]'
                      : 'hover:opacity-80'
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

          <div>
            <div className={lbl} style={lblStyle}>描述</div>
            <textarea className="input h-24 resize-none" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="活动详情..." />
          </div>

          <div>
            <div className={lbl} style={lblStyle}>备注</div>
            <textarea className="input h-20 resize-none" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="内部备注..." />
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between px-8 py-5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          {submitted && hasErrors ? (
            <span className="text-[13px] text-[#d93025]">请填写所有必填字段</span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <button onClick={closeEventModal}
              className="h-10 px-5 rounded-full text-[14px] font-medium transition-colors" style={{ color: 'var(--accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              取消
            </button>
            <button onClick={handleSave}
              className="btn-primary h-10 px-6">
              {editingEvent ? '保存修改' : '创建活动'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
