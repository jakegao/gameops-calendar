import type { EventCategory, EventSubType, EventStatus, Priority, TeamRole, LayerType, PoolType, RewardType, ModuleCategory, VersionStatus } from '../types/index.ts';

/**
 * Apple SF System Colors — 统一色板
 * https://developer.apple.com/design/human-interface-guidelines/color
 */

/** 活动分类颜色 — Apple System Colors */
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  paid: '#ff9f0a',       // Apple System Orange
  engagement: '#34c759', // Apple System Green
  version: '#007aff',    // Apple System Blue
  esports: '#af52de',    // Apple System Purple
  marketing: '#ff2d55',  // Apple System Pink
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

/** 状态名称与颜色 — Apple System Colors + color-mix for backgrounds */
export const STATUS_CONFIG: Record<EventStatus, { name: string; color: string; bg: string }> = {
  draft:       { name: '草稿',   color: '#8e8e93', bg: 'color-mix(in srgb, #8e8e93 8%, #f5f5f7)' },
  planned:     { name: '已规划', color: '#007aff', bg: 'color-mix(in srgb, #007aff 8%, #f5f5f7)' },
  in_review:   { name: '评审中', color: '#ff9f0a', bg: 'color-mix(in srgb, #ff9f0a 8%, #f5f5f7)' },
  approved:    { name: '已批准', color: '#34c759', bg: 'color-mix(in srgb, #34c759 8%, #f5f5f7)' },
  in_progress: { name: '进行中', color: '#af52de', bg: 'color-mix(in srgb, #af52de 8%, #f5f5f7)' },
  live:        { name: '已上线', color: '#ff3b30', bg: 'color-mix(in srgb, #ff3b30 8%, #f5f5f7)' },
  completed:   { name: '已完成', color: '#8e8e93', bg: 'color-mix(in srgb, #8e8e93 8%, #f5f5f7)' },
  cancelled:   { name: '已取消', color: '#aeaeb2', bg: 'color-mix(in srgb, #aeaeb2 6%, #f5f5f7)' },
};

/** 优先级配置 — Apple System Colors */
export const PRIORITY_CONFIG: Record<Priority, { name: string; color: string }> = {
  P0: { name: 'P0 - 最高', color: '#ff3b30' },  // Apple System Red
  P1: { name: 'P1 - 高',   color: '#ff9f0a' },  // Apple System Orange
  P2: { name: 'P2 - 中',   color: '#007aff' },  // Apple System Blue
  P3: { name: 'P3 - 低',   color: '#8e8e93' },  // Apple System Gray
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

/** 图层配置 — Apple System Colors */
export const LAYER_CONFIG: Record<LayerType, { name: string; color: string; defaultVisible: boolean }> = {
  activity: { name: '运营活动', color: '#ff9f0a', defaultVisible: true },
  version: { name: '版本更新', color: '#007aff', defaultVisible: true },
  holiday: { name: '节假日/赛事', color: '#ff3b30', defaultVisible: true },
  esports: { name: '电竞赛事', color: '#af52de', defaultVisible: true },
  marketing: { name: '市场推广', color: '#ff2d55', defaultVisible: false },
};

/** 版本状态配置 */
export const VERSION_STATUS_CONFIG: Record<VersionStatus, { name: string; color: string; bg: string }> = {
  planning: { name: '规划中', color: '#ff9f0a', bg: 'color-mix(in srgb, #ff9f0a 8%, #f5f5f7)' },
  active:   { name: '进行中', color: '#34c759', bg: 'color-mix(in srgb, #34c759 8%, #f5f5f7)' },
  completed:{ name: '已结束', color: '#8e8e93', bg: 'color-mix(in srgb, #8e8e93 8%, #f5f5f7)' },
};

/** 版本颜色预设（5个版本轮替） */
export const VERSION_COLORS: string[] = [
  '#007aff',  // Blue
  '#34c759',  // Green
  '#ff9f0a',  // Orange
  '#af52de',  // Purple
  '#ff2d55',  // Pink
];

/** 奖池类型名称 */
export const POOL_TYPE_NAMES: Record<PoolType, string> = {
  lucky_pool: '幸运值池',
  fragment_pool: '碎片池',
  mixed_pool: '混池',
  blind_box: '盲盒',
  jump_pool: '跳池',
  fragment_exchange: '碎片兑换',
  rare_pool: '珍奇池',
  costume_pool: '装扮券奖池',
  live_sale: '直播售卖',
  other_pool: '其他',
};

/** 奖励类型名称 */
export const REWARD_TYPE_NAMES: Record<RewardType, string> = {
  s_plus_character: 'S+角色',
  s_character: 'S角色',
  s_melee: 'S近战',
  s_plus_melee: 'S+近战',
  s_gun_skin: 'S枪皮',
  s_plus_gun_skin: 'S+枪皮',
  a_gun: 'A级枪械',
  a_avatar: 'A级avatar',
  accessory: '挂饰',
  equipment: '配件',
  costume_ticket: '装扮券',
  other_reward: '其他',
};

/** 模块分类名称 */
export const MODULE_CATEGORY_NAMES: Record<ModuleCategory, string> = {
  melee: '近战',
  character: '角色',
  weapon: '枪械',
  season_book: '赛季手册',
  accessory: '挂饰/配件',
  costume: '装扮',
  other_module: '其他',
};
