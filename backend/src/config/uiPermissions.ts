import { PermissionKey } from './permissions';

export type UiPermissionMode = 'all' | 'any';

export type UiPermissionDefinition = {
  key: string;
  label: string;
  group: string;
  required?: PermissionKey[];
  mode?: UiPermissionMode;
  grants?: PermissionKey[];
};

type UiPermissionGroup = {
  id: string;
  name: string;
};

const UI_PERMISSION_GROUPS: UiPermissionGroup[] = [
  { id: 'dock', name: 'Dock导航' },
  { id: 'chat-actions', name: '对话窗口快捷操作' },
  { id: 'conversation-actions', name: '对话快捷入口' },
  { id: 'tasks', name: '任务与工单' },
  { id: 'knowledge-management', name: '知识管理' },
  { id: 'knowledge-application', name: '知识应用' },
  { id: 'tools', name: '工具中心' },
  { id: 'reports-quality', name: '报表与质检' },
  { id: 'customer', name: '客户信息' },
  { id: 'permissions', name: '权限管理' },
];

const UI_PERMISSIONS: UiPermissionDefinition[] = [
  {
    key: 'dock.messages',
    label: '消息入口',
    group: 'dock',
    required: ['im.read'],
  },
  {
    key: 'dock.messages.dialog',
    label: '消息-对话',
    group: 'dock',
    required: ['im.read'],
  },
  {
    key: 'dock.messages.tasks',
    label: '消息-任务',
    group: 'dock',
    required: ['tasks.read'],
  },
  {
    key: 'dock.knowledge',
    label: '知识入口',
    group: 'dock',
    required: ['knowledge.read'],
  },
  {
    key: 'dock.tools',
    label: '工具入口',
    group: 'dock',
    required: ['monitoring.read', 'monitoring.write', 'audit.read', 'audit.write', 'session.read'],
    mode: 'any',
    grants: [],
  },
  {
    key: 'dock.reports',
    label: '报表入口',
    group: 'dock',
    required: ['audit.read'],
  },
  {
    key: 'dock.permissions',
    label: '权限入口',
    group: 'dock',
    required: ['permissions.members.manage', 'permissions.roles.manage'],
    mode: 'any',
  },
  {
    key: 'knowledge.management.view',
    label: '知识管理子页',
    group: 'dock',
    required: ['knowledge.read'],
  },
  {
    key: 'knowledge.application.view',
    label: '知识应用子页',
    group: 'dock',
    required: ['knowledge.read'],
  },
  {
    key: 'analysis.panel.open',
    label: '分析面板',
    group: 'chat-actions',
    required: ['ai.use'],
  },
  {
    key: 'chat.mode.auto',
    label: 'Agent自动',
    group: 'chat-actions',
    required: ['im.write'],
  },
  {
    key: 'chat.mode.supervised',
    label: 'Agent监督',
    group: 'chat-actions',
    required: ['im.write'],
  },
  {
    key: 'chat.mode.human',
    label: '人工优先',
    group: 'chat-actions',
    required: ['im.write'],
  },
  {
    key: 'chat.escalate.human',
    label: '立即交付人工',
    group: 'chat-actions',
    required: ['tasks.write'],
  },
  {
    key: 'chat.action.emoji',
    label: '表情',
    group: 'chat-actions',
    required: ['im.write'],
  },
  {
    key: 'chat.action.attachment',
    label: '附件',
    group: 'chat-actions',
    required: ['im.write'],
  },
  {
    key: 'chat.action.mention',
    label: '提及',
    group: 'chat-actions',
    required: ['im.write'],
  },
  {
    key: 'chat.action.optimize',
    label: '话术优化',
    group: 'chat-actions',
    required: ['ai.use'],
  },
  {
    key: 'chat.action.send',
    label: '发送消息',
    group: 'chat-actions',
    required: ['im.write'],
  },
  {
    key: 'ai.reply.adopt',
    label: '采纳回复建议',
    group: 'chat-actions',
    required: ['ai.use'],
  },
  {
    key: 'actions.ticket.manage',
    label: '工单管理',
    group: 'conversation-actions',
    required: ['tasks.read'],
  },
  {
    key: 'actions.reply.suggest',
    label: '回复建议',
    group: 'conversation-actions',
    required: ['ai.use'],
  },
  {
    key: 'actions.clarify',
    label: '问题澄清',
    group: 'conversation-actions',
    required: ['im.read'],
  },
  {
    key: 'actions.requirement.detect',
    label: '需求检测',
    group: 'conversation-actions',
    required: ['requirements.read'],
  },
  {
    key: 'actions.ai.solution',
    label: 'AI解决方案',
    group: 'conversation-actions',
    required: ['ai.use'],
  },
  {
    key: 'actions.assist.check',
    label: '辅助排查',
    group: 'conversation-actions',
    required: ['ai.use'],
  },
  {
    key: 'actions.ticket.create',
    label: '创建工单',
    group: 'conversation-actions',
    required: ['tasks.write'],
  },
  {
    key: 'actions.fault.report',
    label: '生成故障报告',
    group: 'conversation-actions',
    required: ['tasks.write'],
  },
  {
    key: 'requirements.refresh',
    label: '需求刷新',
    group: 'conversation-actions',
    required: ['requirements.read'],
  },
  {
    key: 'requirements.scan',
    label: '需求扫描',
    group: 'conversation-actions',
    required: ['requirements.read'],
  },
  {
    key: 'requirements.create',
    label: '需求创建卡片',
    group: 'conversation-actions',
    required: ['requirements.write'],
  },
  {
    key: 'requirements.ignore',
    label: '需求忽略',
    group: 'conversation-actions',
    required: ['requirements.write'],
  },
  {
    key: 'requirements.view',
    label: '需求查看详情',
    group: 'conversation-actions',
    required: ['requirements.read'],
  },
  {
    key: 'tasks.conversation.start',
    label: '对话驱动任务',
    group: 'tasks',
    required: ['tasks.write'],
  },
  {
    key: 'tasks.agent.send',
    label: '派发给Agent',
    group: 'tasks',
    required: ['tasks.assign'],
  },
  {
    key: 'tasks.command.announcement',
    label: '公告生成',
    group: 'tasks',
    required: ['tasks.write'],
  },
  {
    key: 'tasks.command.daily',
    label: '每日巡检',
    group: 'tasks',
    required: ['tasks.write'],
  },
  {
    key: 'tasks.command.longterm',
    label: '长期化',
    group: 'tasks',
    required: ['tasks.write'],
  },
  {
    key: 'knowledge.manage.upload',
    label: '上传文档',
    group: 'knowledge-management',
    required: ['knowledge.write'],
  },
  {
    key: 'knowledge.manage.delete',
    label: '删除文档',
    group: 'knowledge-management',
    required: ['knowledge.write'],
  },
  {
    key: 'knowledge.manage.faq.create',
    label: '新增FAQ',
    group: 'knowledge-management',
    required: ['knowledge.write'],
  },
  {
    key: 'knowledge.manage.faq.detect',
    label: 'FAQ检测',
    group: 'knowledge-management',
    required: ['knowledge.write'],
  },
  {
    key: 'knowledge.manage.faq.similar.add',
    label: '相似问题添加',
    group: 'knowledge-management',
    required: ['knowledge.write'],
  },
  {
    key: 'knowledge.manage.faq.similar.generate',
    label: '相似问题生成',
    group: 'knowledge-management',
    required: ['knowledge.write'],
  },
  {
    key: 'knowledge.manage.faq.save',
    label: 'FAQ保存',
    group: 'knowledge-management',
    required: ['knowledge.write'],
  },
  {
    key: 'knowledge.manage.faq.delete',
    label: 'FAQ删除',
    group: 'knowledge-management',
    required: ['knowledge.write'],
  },
  {
    key: 'knowledge.application.search',
    label: '搜索',
    group: 'knowledge-application',
    required: ['knowledge.read'],
  },
  {
    key: 'knowledge.application.shortcut',
    label: '快捷入口',
    group: 'knowledge-application',
    required: ['knowledge.read'],
  },
  {
    key: 'knowledge.application.copy',
    label: '复制内容',
    group: 'knowledge-application',
    required: ['knowledge.read'],
  },
  {
    key: 'tools.system.monitor',
    label: '服务状态监控',
    group: 'tools',
    required: ['monitoring.read'],
  },
  {
    key: 'tools.system.database',
    label: '数据库管理',
    group: 'tools',
    required: ['monitoring.write'],
  },
  {
    key: 'tools.system.permissions',
    label: '用户权限管理',
    group: 'tools',
    required: ['session.read'],
  },
  {
    key: 'tools.system.backup',
    label: '数据备份',
    group: 'tools',
    required: ['monitoring.write'],
  },
  {
    key: 'tools.system.logs',
    label: '错误日志分析',
    group: 'tools',
    required: ['monitoring.read'],
  },
  {
    key: 'tools.system.settings',
    label: '系统配置',
    group: 'tools',
    required: ['monitoring.write'],
  },
  {
    key: 'tools.quick.notify',
    label: '发送系统通知',
    group: 'tools',
    required: ['audit.write'],
  },
  {
    key: 'tools.quick.ticket',
    label: '创建事件工单',
    group: 'tools',
    required: ['tasks.write'],
  },
  {
    key: 'tools.quick.escalate',
    label: '升级问题',
    group: 'tools',
    required: ['tasks.write'],
  },
  {
    key: 'tools.quick.report',
    label: '生成报告',
    group: 'tools',
    required: ['audit.read'],
  },
  {
    key: 'reports.view',
    label: '报表查看',
    group: 'reports-quality',
    required: ['audit.read'],
  },
  {
    key: 'quality.view.mixed',
    label: '质检综合视图',
    group: 'reports-quality',
    required: ['tasks.read'],
  },
  {
    key: 'quality.view.analysis',
    label: '质检分析视图',
    group: 'reports-quality',
    required: ['tasks.read'],
  },
  {
    key: 'quality.view.conversation',
    label: '对话复盘视图',
    group: 'reports-quality',
    required: ['tasks.read'],
  },
  {
    key: 'quality.action.report',
    label: '生成质检报告',
    group: 'reports-quality',
    required: ['tasks.write'],
  },
  {
    key: 'quality.action.suggest',
    label: '推送优化建议',
    group: 'reports-quality',
    required: ['tasks.write'],
  },
  {
    key: 'quality.action.followup',
    label: '服务回访',
    group: 'reports-quality',
    required: ['tasks.write'],
  },
  {
    key: 'quality.action.review',
    label: '标记复盘任务',
    group: 'reports-quality',
    required: ['tasks.write'],
  },
  {
    key: 'quality.overview.back',
    label: '返回质检概览',
    group: 'reports-quality',
    required: ['tasks.read'],
  },
  {
    key: 'customer.history.view',
    label: '历史对话记录',
    group: 'customer',
    required: ['customers.read'],
  },
  {
    key: 'permissions.members.manage',
    label: '成员管理',
    group: 'permissions',
    required: ['permissions.members.manage'],
  },
  {
    key: 'permissions.roles.manage',
    label: '角色管理',
    group: 'permissions',
    required: ['permissions.roles.manage'],
  },
];

export function listAllUiPermissions(): UiPermissionDefinition[] {
  return [...UI_PERMISSIONS];
}

export function listUiPermissionGroups(): Array<{ id: string; name: string; items: Array<{ key: string; label: string }> }> {
  return UI_PERMISSION_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    items: UI_PERMISSIONS.filter((permission) => permission.group === group.id)
      .map((permission) => ({
        key: permission.key,
        label: permission.label,
      })),
  }));
}

export function resolveUiPermissions(rolePermissions: PermissionKey[]): Record<string, boolean> {
  const available = new Set(rolePermissions);
  const result: Record<string, boolean> = {};

  UI_PERMISSIONS.forEach((permission) => {
    const required = permission.required ?? [];
    if (!required.length) {
      result[permission.key] = true;
      return;
    }
    if (permission.mode === 'any') {
      result[permission.key] = required.some((key) => available.has(key));
      return;
    }
    result[permission.key] = required.every((key) => available.has(key));
  });

  return result;
}

export function resolvePermissionsFromUiKeys(uiKeys: string[]): PermissionKey[] {
  const result = new Set<PermissionKey>();
  const keySet = new Set(uiKeys);

  UI_PERMISSIONS.forEach((permission) => {
    if (!keySet.has(permission.key)) {
      return;
    }
    const grants = permission.grants ?? permission.required ?? [];
    grants.forEach((grant) => result.add(grant));
  });

  return Array.from(result);
}
