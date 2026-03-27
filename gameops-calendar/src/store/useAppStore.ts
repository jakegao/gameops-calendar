import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  GameEvent, Holiday, EventTemplate, ConflictInfo,
  CalendarView, GanttScale, LayerType, TeamRole, EventCategory,
  Comment, ChangeLog, CurrentUser, ShareLink,
} from '../types/index.ts';
import { mockEvents, mockHolidays, mockTemplates } from '../data/mockData.ts';
import { SUBTYPE_CATEGORY, CATEGORY_COLORS } from '../constants/index.ts';
import { parseISO, areIntervalsOverlapping } from 'date-fns';

// P3-23: localStorage 持久化
const STORAGE_KEY = 'gameops-calendar-events';
const COMMENTS_KEY = 'gameops-calendar-comments';
const CHANGELOGS_KEY = 'gameops-calendar-changelogs';
const SHARELINKS_KEY = 'gameops-calendar-sharelinks';

function loadEvents(): GameEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length > 0) return parsed; }
  } catch { /* ignore */ }
  return mockEvents;
}
function saveEvents(events: GameEvent[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch { /* ignore */ }
}
function loadComments(): Comment[] {
  try { const raw = localStorage.getItem(COMMENTS_KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return [];
}
function saveComments(comments: Comment[]) {
  try { localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments)); } catch { /* ignore */ }
}
function loadChangeLogs(): ChangeLog[] {
  try { const raw = localStorage.getItem(CHANGELOGS_KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return [];
}
function saveChangeLogs(logs: ChangeLog[]) {
  try { localStorage.setItem(CHANGELOGS_KEY, JSON.stringify(logs)); } catch { /* ignore */ }
}
function loadShareLinks(): ShareLink[] {
  try { const raw = localStorage.getItem(SHARELINKS_KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return [];
}
function saveShareLinks(links: ShareLink[]) {
  try { localStorage.setItem(SHARELINKS_KEY, JSON.stringify(links)); } catch { /* ignore */ }
}

// ============================================================
// 主 Store
// ============================================================

interface UndoEntry {
  type: 'delete';
  event: GameEvent;
  message: string;
}

// B4: AppState 接口完整声明所有字段
interface AppState {
  // === 数据 ===
  events: GameEvent[];
  holidays: Holiday[];
  templates: EventTemplate[];

  // === 视图状态 ===
  currentView: 'calendar' | 'gantt' | 'board' | 'dashboard';
  calendarView: CalendarView;
  ganttScale: GanttScale;
  currentDate: Date;
  selectedEventId: string | null;

  // === 图层 ===
  visibleLayers: Record<LayerType, boolean>;

  // === 过滤 ===
  filterCategories: EventCategory[];
  filterRole: TeamRole | null;
  searchQuery: string;

  // === 弹窗 ===
  isEventModalOpen: boolean;
  editingEvent: GameEvent | null;
  isTemplateModalOpen: boolean;
  isExportModalOpen: boolean;
  isDetailPanelOpen: boolean;

  // === Snackbar ===
  snackbar: { message: string; undoEntry?: UndoEntry | null } | null;

  // === Actions ===
  setCurrentView: (view: 'calendar' | 'gantt' | 'board' | 'dashboard') => void;
  setCalendarView: (view: CalendarView) => void;
  setGanttScale: (scale: GanttScale) => void;
  setCurrentDate: (date: Date) => void;
  selectEvent: (id: string | null) => void;
  toggleLayer: (layer: LayerType) => void;
  setFilterCategories: (cats: EventCategory[]) => void;
  setFilterRole: (role: TeamRole | null) => void;
  setSearchQuery: (q: string) => void;

  // === CRUD ===
  addEvent: (event: Omit<GameEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEvent: (id: string, updates: Partial<GameEvent>) => void;
  deleteEvent: (id: string) => void;
  duplicateEvent: (id: string) => void;
  createFromTemplate: (templateId: string, startDate: string) => void;
  importEvents: (events: Omit<GameEvent, 'id' | 'createdAt' | 'updatedAt'>[]) => void;

  // === Undo ===
  undoDelete: () => void;
  dismissSnackbar: () => void;

  // === 弹窗 ===
  openEventModal: (event?: GameEvent) => void;
  closeEventModal: () => void;
  openTemplateModal: () => void;
  closeTemplateModal: () => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  openDetailPanel: (id: string) => void;
  closeDetailPanel: () => void;

  // === 拖拽 ===
  moveEvent: (id: string, newStartDate: string, newEndDate: string) => void;

  // === 工具 ===
  getFilteredEvents: () => GameEvent[];
  detectConflicts: () => ConflictInfo[];

  // === Phase3: 协同 (B4: 完整声明) ===
  currentUser: CurrentUser;
  comments: Comment[];
  changeLogs: ChangeLog[];
  shareLinks: ShareLink[];
  addComment: (eventId: string, content: string) => void;
  deleteComment: (commentId: string) => void;
  getEventComments: (eventId: string) => Comment[];
  getEventChangeLogs: (eventId: string) => ChangeLog[];
  createShareLink: () => ShareLink;
  isShareMode: boolean;
  setShareMode: (v: boolean) => void;

  // === 双击新建传入默认日期 (B3修复) ===
  defaultStartDate: string | null;
  setDefaultStartDate: (d: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // === 初始数据（P3-23: 从 localStorage 加载） ===
  events: loadEvents(),
  holidays: mockHolidays,
  templates: mockTemplates,

  // === 视图状态 ===
  currentView: 'calendar',
  calendarView: 'month',
  ganttScale: 'day',
  currentDate: new Date(2026, 2, 1),
  selectedEventId: null,

  // === 图层 ===
  visibleLayers: {
    activity: true,
    version: true,
    holiday: true,
    esports: true,
    marketing: true,
  },

  // === 过滤 ===
  filterCategories: [],
  filterRole: null,
  searchQuery: '',

  // === 弹窗 ===
  isEventModalOpen: false,
  editingEvent: null,
  isTemplateModalOpen: false,
  isExportModalOpen: false,
  isDetailPanelOpen: false,

  // === Snackbar ===
  snackbar: null,

  // === B3: 双击新建默认日期 ===
  defaultStartDate: null,
  setDefaultStartDate: (d) => set({ defaultStartDate: d }),

  // === Actions ===
  setCurrentView: (view) => set({ currentView: view }),
  setCalendarView: (view) => set({ calendarView: view }),
  setGanttScale: (scale) => set({ ganttScale: scale }),
  setCurrentDate: (date) => set({ currentDate: date }),
  selectEvent: (id) => set({ selectedEventId: id }),
  toggleLayer: (layer) =>
    set((s) => ({
      visibleLayers: { ...s.visibleLayers, [layer]: !s.visibleLayers[layer] },
    })),
  setFilterCategories: (cats) => set({ filterCategories: cats }),
  setFilterRole: (role) => set({ filterRole: role }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  // === CRUD ===
  addEvent: (eventData) => {
    const now = new Date().toISOString();
    const user = get().currentUser;
    const newEvent: GameEvent = { ...eventData, id: uuidv4(), createdAt: now, updatedAt: now };
    const log: ChangeLog = { id: uuidv4(), eventId: newEvent.id, action: 'create', author: user.name, detail: `创建活动「${newEvent.title}」`, timestamp: now };
    set((s) => {
      const events = [...s.events, newEvent];
      const changeLogs = [...s.changeLogs, log];
      saveEvents(events);
      saveChangeLogs(changeLogs);
      return { events, changeLogs };
    });
  },

  updateEvent: (id, updates) => {
    const old = get().events.find((e) => e.id === id);
    const user = get().currentUser;
    const now = new Date().toISOString();
    const action = updates.status && old && updates.status !== old.status ? 'status_change' as const : 'update' as const;
    const detail = action === 'status_change' ? `状态变更为「${updates.status}」` : `编辑活动「${old?.title || ''}」`;
    const log: ChangeLog = { id: uuidv4(), eventId: id, action, author: user.name, detail, timestamp: now };
    set((s) => {
      const events = s.events.map((e) => e.id === id ? { ...e, ...updates, updatedAt: now } : e);
      const changeLogs = [...s.changeLogs, log];
      saveEvents(events);
      saveChangeLogs(changeLogs);
      return { events, changeLogs };
    });
  },

  deleteEvent: (id) => {
    const evt = get().events.find((e) => e.id === id);
    const user = get().currentUser;
    const now = new Date().toISOString();
    const log: ChangeLog = { id: uuidv4(), eventId: id, action: 'delete', author: user.name, detail: `删除活动「${evt?.title || ''}」`, timestamp: now };
    set((s) => {
      const events = s.events.filter((e) => e.id !== id);
      const changeLogs = [...s.changeLogs, log];
      saveEvents(events);
      saveChangeLogs(changeLogs);
      return {
        events, changeLogs,
        selectedEventId: s.selectedEventId === id ? null : s.selectedEventId,
        snackbar: evt ? { message: `已删除「${evt.title}」`, undoEntry: { type: 'delete', event: evt, message: `已恢复「${evt.title}」` } } : null,
      };
    });
  },

  duplicateEvent: (id) => {
    const evt = get().events.find((e) => e.id === id);
    if (!evt) return;
    const now = new Date().toISOString();
    const dup: GameEvent = { ...evt, id: uuidv4(), title: `${evt.title} (副本)`, status: 'draft', createdAt: now, updatedAt: now };
    set((s) => {
      const events = [...s.events, dup];
      saveEvents(events);
      return { events };
    });
  },

  createFromTemplate: (templateId, startDate) => {
    const tpl = get().templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const start = parseISO(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + tpl.defaultDuration);
    const now = new Date().toISOString();
    const newEvent: GameEvent = {
      id: uuidv4(), title: tpl.name, description: tpl.description, category: tpl.category,
      subType: tpl.subType, priority: 'P1', status: 'draft', startDate,
      endDate: end.toISOString().slice(0, 10), color: tpl.color, tags: [...tpl.defaultTags],
      owner: '', teamRoles: [...tpl.defaultTeamRoles], dependencies: [], notes: '', createdAt: now, updatedAt: now,
    };
    set((s) => {
      const events = [...s.events, newEvent];
      saveEvents(events);
      return { events, isTemplateModalOpen: false };
    });
  },

  // B12: importEvents snackbar 类型修复，不含 undoEntry
  importEvents: (newEvents) => {
    const now = new Date().toISOString();
    const created = newEvents.map((e) => ({ ...e, id: uuidv4(), createdAt: now, updatedAt: now }));
    set((s) => {
      const events = [...s.events, ...created];
      saveEvents(events);
      return { events, snackbar: { message: `成功导入 ${created.length} 个活动`, undoEntry: null } };
    });
  },

  // Undo
  undoDelete: () => {
    const { snackbar } = get();
    if (!snackbar?.undoEntry || snackbar.undoEntry.type !== 'delete') return;
    set((s) => {
      const events = [...s.events, snackbar.undoEntry!.event];
      saveEvents(events);
      return { events, snackbar: null };
    });
  },
  dismissSnackbar: () => set({ snackbar: null }),

  // === 弹窗 ===
  openEventModal: (event) =>
    set({ isEventModalOpen: true, editingEvent: event ?? null }),
  closeEventModal: () =>
    set({ isEventModalOpen: false, editingEvent: null, defaultStartDate: null }),
  openTemplateModal: () => set({ isTemplateModalOpen: true }),
  closeTemplateModal: () => set({ isTemplateModalOpen: false }),
  openExportModal: () => set({ isExportModalOpen: true }),
  closeExportModal: () => set({ isExportModalOpen: false }),
  openDetailPanel: (id) =>
    set({ isDetailPanelOpen: true, selectedEventId: id }),
  closeDetailPanel: () =>
    set({ isDetailPanelOpen: false }),

  // === 拖拽 — F3: moveEvent 也记录变更日志 ===
  moveEvent: (id, newStartDate, newEndDate) => {
    const old = get().events.find((e) => e.id === id);
    const user = get().currentUser;
    const now = new Date().toISOString();
    const log: ChangeLog = { id: uuidv4(), eventId: id, action: 'update', author: user.name, detail: `拖拽移动「${old?.title || ''}」日期至 ${newStartDate}~${newEndDate}`, timestamp: now };
    set((s) => {
      const events = s.events.map((e) =>
        e.id === id ? { ...e, startDate: newStartDate, endDate: newEndDate, updatedAt: now } : e
      );
      const changeLogs = [...s.changeLogs, log];
      saveEvents(events);
      saveChangeLogs(changeLogs);
      return { events, changeLogs };
    });
  },

  // === 工具方法 ===
  getFilteredEvents: () => {
    const { events, filterCategories, filterRole, searchQuery, visibleLayers } = get();
    let filtered = events;
    filtered = filtered.filter((e) => {
      const layerMap: Record<EventCategory, LayerType> = {
        paid: 'activity', engagement: 'activity', version: 'version', esports: 'esports', marketing: 'marketing',
      };
      return visibleLayers[layerMap[e.category]];
    });
    if (filterCategories.length > 0) filtered = filtered.filter((e) => filterCategories.includes(e.category));
    if (filterRole) filtered = filtered.filter((e) => e.teamRoles.includes(filterRole));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((e) =>
        e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return filtered;
  },

  detectConflicts: () => {
    const events = get().events.filter((e) => e.status !== 'cancelled' && e.status !== 'completed');
    const conflicts: ConflictInfo[] = [];
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i]; const b = events[j];
        try {
          const overlap = areIntervalsOverlapping(
            { start: parseISO(a.startDate), end: parseISO(a.endDate) },
            { start: parseISO(b.startDate), end: parseISO(b.endDate) }
          );
          if (overlap && a.category === b.category && a.subType === b.subType) {
            conflicts.push({
              type: 'category_crowd', severity: 'warning', eventIds: [a.id, b.id],
              message: `同类型活动时间重叠：「${a.title}」与「${b.title}」`,
            });
          }
        } catch { /* skip */ }
      }
    }
    return conflicts;
  },

  // === Phase3: 协同 — F4: 所有协同数据持久化到 localStorage ===
  currentUser: { name: '运营经理', role: 'ops_manager', permission: 'admin' },
  comments: loadComments(),
  changeLogs: loadChangeLogs(),
  shareLinks: loadShareLinks(),
  isShareMode: false,
  setShareMode: (v) => set({ isShareMode: v }),

  addComment: (eventId, content) => {
    const user = get().currentUser;
    const now = new Date().toISOString();
    const comment: Comment = { id: uuidv4(), eventId, author: user.name, content, createdAt: now };
    const log: ChangeLog = { id: uuidv4(), eventId, action: 'comment', author: user.name, detail: content.slice(0, 50), timestamp: now };
    set((s) => {
      const comments = [...s.comments, comment];
      const changeLogs = [...s.changeLogs, log];
      saveComments(comments);
      saveChangeLogs(changeLogs);
      return { comments, changeLogs };
    });
  },

  // F5: deleteComment 也记录变更日志
  deleteComment: (commentId) => {
    const comment = get().comments.find((c) => c.id === commentId);
    const user = get().currentUser;
    const now = new Date().toISOString();
    set((s) => {
      const comments = s.comments.filter((c) => c.id !== commentId);
      const changeLogs = comment ? [...s.changeLogs, { id: uuidv4(), eventId: comment.eventId, action: 'update' as const, author: user.name, detail: `删除评论`, timestamp: now }] : s.changeLogs;
      saveComments(comments);
      saveChangeLogs(changeLogs);
      return { comments, changeLogs };
    });
  },

  getEventComments: (eventId) => get().comments.filter((c) => c.eventId === eventId),

  getEventChangeLogs: (eventId) => get().changeLogs.filter((l) => l.eventId === eventId),

  createShareLink: () => {
    const token = uuidv4().replace(/-/g, '').slice(0, 16);
    const link: ShareLink = {
      id: uuidv4(), token, createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      createdBy: get().currentUser.name,
    };
    set((s) => {
      const shareLinks = [...s.shareLinks, link];
      saveShareLinks(shareLinks);
      return { shareLinks };
    });
    return link;
  },
}));
