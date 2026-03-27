import type { EventCategory, EventSubType, EventStatus, Priority, TeamRole, LayerType } from '../types/index.ts';

/** 活动分类颜色 */
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  paid: '#f59e0b',
  engagement: '#22c55e',
  version: '#3b82f6',
  esports: '#a855f7',
  marketing: '#ec4899',
};

/** 活动分类名称 */
export const CATEGORY_NAMES: Record<EventCategory, string> = {
  paid: '💰 付费活动',
  engagement: '🎯 促活活动',
  version: '📢 版本更新',
  esports: '🏆 赛事/竞技',
  marketing: '📣 市场推广',
};

/** 活动子类型名称 */
export const SUBTYPE_NAMES: Record<EventSubType, string> = {
  limited_pack: '限时礼包/折扣',
  first_charge: '首充/累充活动',
  battle_pass: '通行证/赛季卡',
  gacha: '抽奖/概率活动',
  new_skin: '新角色/新皮肤',
  daily_login: '签到活动',
  challenge: '任务挑战活动',
  return_player: '回归活动',
  festival: '节日主题活动',
  major_update: '大版本更新',
  minor_update: '小版本迭代',
  hotfix: '热修复',
  season_update: '赛季更新',
  season_start: '赛季开启',
  season_end: '赛季结算',
  tournament: '排位赛/锦标赛',
  esports_collab: '电竞联赛配合',
  brand_collab: '品牌联动',
  kol_campaign: 'KOL合作',
  store_feature: '应用商店推荐',
  social_campaign: '社交媒体Campaign',
};

/** 子类型对应的分类 */
export const SUBTYPE_CATEGORY: Record<EventSubType, EventCategory> = {
  limited_pack: 'paid', first_charge: 'paid', battle_pass: 'paid', gacha: 'paid', new_skin: 'paid',
  daily_login: 'engagement', challenge: 'engagement', return_player: 'engagement', festival: 'engagement',
  major_update: 'version', minor_update: 'version', hotfix: 'version', season_update: 'version',
  season_start: 'esports', season_end: 'esports', tournament: 'esports', esports_collab: 'esports',
  brand_collab: 'marketing', kol_campaign: 'marketing', store_feature: 'marketing', social_campaign: 'marketing',
};

/** 状态名称与颜色 */
export const STATUS_CONFIG: Record<EventStatus, { name: string; color: string; bg: string }> = {
  draft: { name: '草稿', color: '#5e6c84', bg: '#f4f5f7' },
  planned: { name: '已规划', color: '#0052cc', bg: '#deebff' },
  in_review: { name: '评审中', color: '#ff991f', bg: '#fffae6' },
  approved: { name: '已批准', color: '#36b37e', bg: '#e3fcef' },
  in_progress: { name: '进行中', color: '#6554c0', bg: '#eae6ff' },
  live: { name: '已上线', color: '#de350b', bg: '#ffebe6' },
  completed: { name: '已完成', color: '#5e6c84', bg: '#f4f5f7' },
  cancelled: { name: '已取消', color: '#97a0af', bg: '#f4f5f7' },
};

/** 优先级配置 */
export const PRIORITY_CONFIG: Record<Priority, { name: string; color: string }> = {
  P0: { name: 'P0 - 最高', color: '#ef4444' },
  P1: { name: 'P1 - 高', color: '#f59e0b' },
  P2: { name: 'P2 - 中', color: '#3b82f6' },
  P3: { name: 'P3 - 低', color: '#6b7280' },
};

/** 角色配置 */
export const ROLE_CONFIG: Record<TeamRole, { name: string; icon: string }> = {
  ops_manager: { name: '运营经理', icon: '👔' },
  planner: { name: '活动策划', icon: '📋' },
  artist: { name: '美术/UI', icon: '🎨' },
  developer: { name: '技术开发', icon: '💻' },
  qa: { name: 'QA测试', icon: '🧪' },
  marketing: { name: '市场推广', icon: '📢' },
  data_analyst: { name: '数据分析', icon: '📊' },
};

/** 图层配置 */
export const LAYER_CONFIG: Record<LayerType, { name: string; color: string; defaultVisible: boolean }> = {
  activity: { name: '运营活动', color: '#f59e0b', defaultVisible: true },
  version: { name: '版本更新', color: '#3b82f6', defaultVisible: true },
  holiday: { name: '节假日/赛事', color: '#ef4444', defaultVisible: true },
  esports: { name: '电竞赛事', color: '#a855f7', defaultVisible: true },
  marketing: { name: '市场推广', color: '#ec4899', defaultVisible: false },
};
