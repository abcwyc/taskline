import type { AppLocale } from '@/lib/i18n';

const STATUS_LABELS: Record<string, string> = {
   'in-progress': '进行中',
   'technical-review': '技术审查',
   'done': '已完成',
   'paused': '已暂停',
   'to-do': '待办',
   'backlog': '待规划',
   'triage': '待分流',
   'idea': '想法',
   'product-feedback': '产品反馈',
   'blocked': '受阻',
   'shipped': '已发布',
   'canceled': '已取消',
   'duplicate': '重复',
};

const PRIORITY_LABELS: Record<string, string> = {
   'no-priority': '无优先级',
   'urgent': '紧急',
   'high': '高',
   'medium': '中',
   'low': '低',
};

const HEALTH_LABELS: Record<string, string> = {
   'no-update': '暂无更新',
   'off-track': '偏离计划',
   'on-track': '进展顺利',
   'at-risk': '存在风险',
};

const HEALTH_DESCRIPTIONS: Record<string, string> = {
   'no-update': '该项目过去 30 天内没有更新。',
   'off-track': '该项目已偏离计划，可能延误。',
   'on-track': '该项目按计划顺利推进。',
   'at-risk': '该项目存在风险，可能延误。',
};

export function projectStatusLabel(locale: AppLocale, id: string, fallback: string) {
   return locale === 'zh-CN' ? (STATUS_LABELS[id] ?? fallback) : fallback;
}

export function projectPriorityLabel(locale: AppLocale, id: string, fallback: string) {
   return locale === 'zh-CN' ? (PRIORITY_LABELS[id] ?? fallback) : fallback;
}

export function projectHealthLabel(locale: AppLocale, id: string, fallback: string) {
   return locale === 'zh-CN' ? (HEALTH_LABELS[id] ?? fallback) : fallback;
}

export function projectHealthDescription(locale: AppLocale, id: string, fallback: string) {
   return locale === 'zh-CN' ? (HEALTH_DESCRIPTIONS[id] ?? fallback) : fallback;
}

export function formatProjectDate(locale: AppLocale, iso?: string, includeYear = false) {
   if (!iso) return '—';
   if (locale === 'en') {
      const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
      return new Intl.DateTimeFormat('en-US', {
         month: 'short',
         day: 'numeric',
         ...(includeYear ? { year: 'numeric' } : {}),
      }).format(date);
   }
   const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
   if (!year || !month || !day) return iso;
   return includeYear ? `${year}年${month}月${day}日` : `${month}月${day}日`;
}
