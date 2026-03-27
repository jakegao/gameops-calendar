// ============================================================
// GameOps Calendar - 核心数据类型定义
// ============================================================

/** 活动类型枚举 */
export type EventCategory =
  | 'paid'        // 付费活动
  | 'engagement'  // 促活活动
  | 'version'     // 版本更新
  | 'esports'     // 赛事/竞技
  | 'marketing';  // 市场推广

/** 活动子类型 */
export type EventSubType =
  // 付费
  | 'limited_pack' | 'first_charge' | 'battle_pass' | 'gacha' | 'new_skin'
  // 促活
  | 'daily_login' | 'challenge' | 'return_player' | 'festival'
  // 版本
  | 'major_update' | 'minor_update' | 'hotfix' | 'season_update'
  // 赛事
  | 'season_start' | 'season_end' | 'tournament' | 'esports_collab'
  // 市场
  | 'brand_collab' | 'kol_campaign' | 'store_feature' | 'social_campaign';

/** 活动优先级 */
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

/** 活动状态 */
export type EventStatus =
  | 'draft'       // 草稿
  | 'planned'     // 已规划
  | 'in_review'   // 评审中
  | 'approved'    // 已批准
  | 'in_progress' // 进行中
  | 'live'        // 已上线
  | 'completed'   // 已完成
  | 'cancelled';  // 已取消

/** 图层类型 */
export type LayerType = 'activity' | 'version' | 'holiday' | 'esports' | 'marketing';

/** 日历视图类型 */
export type CalendarView = 'month' | 'week' | 'day';

/** 甘特图时间粒度 */
export type GanttScale = 'day' | 'week' | 'month' | 'quarter';

/** 协同角色 */
export type TeamRole =
  | 'ops_manager'  // 商业化运营经理
  | 'planner'      // 活动策划
  | 'artist'       // 美术/UI
  | 'developer'    // 技术开发
  | 'qa'           // QA测试
  | 'marketing'    // 市场推广
  | 'data_analyst'; // 数据分析

/** 游戏运营活动 */
export interface GameEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  subType: EventSubType;
  priority: Priority;
  status: EventStatus;
  startDate: string;  // ISO date string
  endDate: string;    // ISO date string
  color: string;
  tags: string[];
  owner: string;
  teamRoles: TeamRole[];
  dependencies: string[];  // 依赖的活动id数组
  revenueTarget?: number;
  revenueActual?: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** 节假日/特殊日期 */
export interface Holiday {
  id: string;
  name: string;
  date: string;
  endDate?: string;
  type: 'chinese' | 'western' | 'esports' | 'custom';
  isImportant: boolean;
}

/** 活动模板 */
export interface EventTemplate {
  id: string;
  name: string;
  category: EventCategory;
  subType: EventSubType;
  defaultDuration: number;  // 默认持续天数
  description: string;
  color: string;
  defaultTags: string[];
  defaultTeamRoles: TeamRole[];
  icon: string;
}

/** 冲突检测结果 */
export interface ConflictInfo {
  type: 'time_overlap' | 'resource_conflict' | 'category_crowd';
  severity: 'error' | 'warning' | 'info';
  eventIds: string[];
  message: string;
}

/** 导出格式 */
export type ExportFormat = 'png' | 'pdf' | 'excel' | 'ical';

/** 用户角色权限 */
export type UserPermission = 'admin' | 'editor' | 'viewer';

export interface CurrentUser {
  name: string;
  role: TeamRole;
  permission: UserPermission;
  avatar?: string;
}

/** 评论 */
export interface Comment {
  id: string;
  eventId: string;
  author: string;
  content: string;
  createdAt: string;
}

/** 变更日志 */
export interface ChangeLog {
  id: string;
  eventId: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'comment';
  author: string;
  detail: string;
  timestamp: string;
}

/** 只读分享链接 */
export interface ShareLink {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
}

/** 排期健康度 */
export interface ScheduleHealth {
  score: number;            // 0-100
  density: number;          // 排期密度
  rhythm: number;           // 节奏合理性
  coverage: number;         // 覆盖度
  conflicts: number;        // 冲突数
  suggestions: string[];
}
