import { qs, on } from '../core/dom.js';
import { toggleRightSidebar } from '../ui/layout.js';

let currentConversationId = 'conv-001';
const interactionFilter = {
  range: '7d',
  type: '全部',
};
let interactionFilterBound = false;

const profiles = {
  'conv-001': {
    name: '张三',
    title: 'ABC科技有限公司 | 技术总监',
    tags: ['金牌SLA', '重点客户', '近30天 3次服务'],
    updatedAt: '2023-07-19 11:15',
    focus: '本周回访 + 验证补偿方案',
    contacts: {
      phone: '138****5678',
      email: 'zhang@abc-tech.com',
      wechat: 'ZhangSan_WX',
    },
    sla: 'SLA-金牌服务',
    slaStatus: '有效',
    expire: '2023-12-31',
    products: ['企业ERP系统专业版', '数据分析平台', 'API集成服务'],
    metrics: {
      contractAmount: '¥128,000',
      satisfaction: '4.5/5.0',
      duration: '2年3个月',
    },
    insights: [
      {
        title: '稳定性诉求：认证登录失败后续观察',
        desc: '近 7 天 2 次关于认证/登录的沟通，期望 15 分钟恢复且补偿明确。',
        action: '安排稳定性巡检+补偿方案确认，推送恢复验证报告',
      },
      {
        title: '服务体验：高价值客户，避免画像过期',
        desc: '金牌SLA + 近 30 天 3 次服务，需保持画像新鲜度并记录关键联系人。',
        action: '更新客户画像后再做外呼，提醒业务侧确认是否展示年龄/性别',
      },
      {
        title: '培训/沟通：需要透明的节奏与下一步计划',
        desc: '补偿方案等待确认，需明确责任人、完成时点与证据存档。',
        action: '创建回访任务，12:00 前同步补偿邮件，记录验证证据',
      },
    ],
    interactions: [
      {
        title: '问题解决',
        desc: 'ERP系统数据同步问题',
        date: '2023-07-10',
        icon: 'fa-check',
        type: '服务',
        window: '7d',
        channel: '飞书',
        result: '已解决',
      },
      {
        title: '产品咨询',
        desc: '关于新功能模块的使用咨询',
        date: '2023-06-25',
        icon: 'fa-comment',
        type: '沟通',
        window: '30d',
        channel: '飞书',
        result: '进行中',
      },
      {
        title: '建议',
        desc: '性能优化需求记录',
        date: '2023-05-18',
        icon: 'fa-lightbulb-o',
        type: '营销',
        window: '90d',
        channel: '邮件',
        result: '已记录',
      },
    ],
    conversationHistory: [
      {
        id: 'conv-001-msg1',
        time: '2023-07-19 10:30',
        channel: '飞书',
        summary: '客户反馈认证失败，多用户无法登录',
        detail: 'ERP登录认证失败，多个部门账号无法登录，影响业务运营',
        intent: '故障反馈',
        emotion: '紧急',
        product: '企业ERP系统专业版',
        relatedServiceId: 'srv-auth-recovery',
        anchorLabel: 'ERP系统数据同步问题',
      },
      {
        id: 'conv-001-msg2',
        time: '2023-07-19 10:36',
        channel: '飞书',
        summary: '确认为全员影响，需立即恢复',
        detail: '确认不是单账号问题，期望 15 分钟内恢复',
        intent: '影响评估',
        emotion: '不满',
        product: '企业ERP系统专业版',
        relatedServiceId: 'srv-auth-recovery',
        anchorLabel: 'ERP系统数据同步问题',
      },
      {
        id: 'conv-001-msg3',
        time: '2023-07-19 11:05',
        channel: '电话摘要',
        summary: '提出补偿诉求并确认沟通节奏',
        detail: '客户希望同步补偿方案，12:00 前给到明确反馈',
        intent: '补偿沟通',
        emotion: '中性',
        product: '高级支持服务',
        relatedServiceId: 'srv-comp',
      },
    ],
    serviceRecords: [
      {
        id: 'srv-auth-recovery',
        title: '认证服务紧急恢复',
        date: '2023-07-19 10:30',
        status: '已完成',
        promise: '关键故障15分钟恢复',
        promiseStatus: '已达成',
        duration: '12分钟',
        owner: '运维值班',
        result: '重启认证服务并切换备节点，登录成功率恢复至 99.3%',
        evidence: '恢复截图、监控曲线',
        commitmentId: 'promise-incident',
        relatedConversations: ['conv-001-msg1', 'conv-001-msg2'],
        actions: ['重启认证服务', '切换备用节点', '验证登录成功率', '通知客户'],
        detail: '认证服务异常，完成恢复并验证；恢复用时 12 分钟。',
        completedAt: '2023-07-19 10:42',
        due: '15分钟',
      },
      {
        id: 'srv-comp',
        title: '补偿方案同步',
        date: '2023-07-19 11:05',
        status: '进行中',
        promise: '重大故障补偿沟通',
        promiseStatus: '进行中',
        duration: '-',
        owner: '客户成功',
        result: '拟赠送 1 个月高级支持，等待客户确认',
        evidence: '邮件草稿',
        commitmentId: 'promise-incident',
        relatedConversations: ['conv-001-msg3'],
        actions: ['拟定补偿方案', '等待客户确认'],
        detail: '补偿方案需在当天 12:00 前确认。',
        due: '2023-07-19 12:00',
      },
      {
        id: 'srv-q2-health',
        title: 'Q2 巡检与健康检查',
        date: '2023-06-15',
        status: '已完成',
        promise: '季度巡检',
        promiseStatus: '已达成',
        duration: '2小时',
        owner: '交付团队',
        result: '完成巡检并提交报告',
        evidence: '巡检报告与整改建议',
        commitmentId: 'promise-quarterly',
        relatedConversations: [],
        actions: ['现场巡检', '提交报告'],
        detail: '覆盖核心模块巡检，确认无阻塞风险。',
        completedAt: '2023-06-15 16:00',
        due: 'Q2 06-30',
      },
      {
        id: 'srv-training',
        title: '年度培训-场次1',
        date: '2023-04-20',
        status: '已完成',
        promise: '年度培训2次',
        promiseStatus: '部分达成',
        duration: '1.5小时',
        owner: '培训顾问',
        result: '完成核心用户培训并发送录屏',
        evidence: '培训录屏、签到',
        commitmentId: 'promise-training',
        relatedConversations: [],
        actions: ['完成培训', '发放录屏'],
        detail: '覆盖核心用户培训第一场，待补充第二场。',
        completedAt: '2023-04-20 11:30',
        due: '2023-08-15',
      },
    ],
    commitments: [
      {
        id: 'promise-incident',
        title: '关键故障15分钟恢复',
        metric: '恢复≤15分钟；5分钟响应',
        used: 1,
        total: 1,
        progress: 100,
        status: '达成',
        remark: '本次恢复 12 分钟，响应 2 分钟',
        nextDue: '当前事件已完成',
        risk: null,
      },
      {
        id: 'promise-quarterly',
        title: '季度巡检（4次/年）',
        metric: '每季度 1 次，含报告与整改建议',
        used: 2,
        total: 4,
        progress: 50,
        status: '按计划',
        remark: '已完成 Q1/Q2，Q3 待排期',
        nextDue: 'Q3 截止 09-30',
        risk: '需排期',
      },
      {
        id: 'promise-training',
        title: '年度培训 2 场',
        metric: '每年 2 场，覆盖核心用户',
        used: 1,
        total: 2,
        progress: 50,
        status: '预警',
        remark: '客户期望 8 月前补足第二场',
        nextDue: '08-15',
        risk: '预警',
      },
    ],
    history: [
      {
        id: 'hist-001',
        title: 'ERP系统数据同步问题',
        date: '2023-07-10',
        status: '已解决',
        summary: '问题已解决，客户表示满意',
        detail: '定位到数据同步延迟，由于任务队列阻塞；调整并重启后恢复。',
        transcript: [
          { time: '09:12', role: '客户', content: '系统同步延迟，订单没进来。' },
          { time: '09:15', role: '工程师', content: '收到，正在查看日志。' },
          { time: '09:28', role: '工程师', content: '发现队列阻塞，已清理并重启任务。' },
          { time: '09:35', role: '客户', content: '数据恢复了，谢谢。' },
        ],
        actions: ['定位队列阻塞', '清理积压任务', '重启同步服务', '验证数据完整性'],
      },
      {
        id: 'hist-002',
        title: '关于新功能模块的使用咨询',
        date: '2023-06-25',
        status: '已解决',
        summary: '已提供详细的使用文档和操作指导',
        detail: '通过远程协助完成功能启用，并留下快捷操作手册。',
        transcript: [
          { time: '15:02', role: '客户', content: '想了解新模块的使用。' },
          { time: '15:10', role: '工程师', content: '已发送文档并远程指导开关配置。' },
        ],
        actions: ['远程协助开关配置', '发送使用手册', '记录FAQ到知识库'],
      },
      {
        id: 'hist-003',
        title: '系统性能优化建议',
        date: '2023-05-18',
        status: '已记录',
        summary: '客户提出性能优化建议，已转产品团队评估',
        detail: '建议在月底发布的版本中加入索引优化与缓存策略改进。',
        transcript: [
          { time: '10:05', role: '客户', content: '希望列表查询更快。' },
          { time: '10:20', role: '工程师', content: '记录需求，转产品评估索引与缓存方案。' },
        ],
        actions: ['记录需求', '转交产品团队', '排期评估'],
      },
    ],
    contractRange: '2023-01-01 ~ 2023-12-31',
  },
  'conv-002': {
    name: '李四',
    title: '财务部 | 运营经理',
    tags: ['银牌SLA', '账单相关', '近30天 1次服务'],
    updatedAt: '2023-07-08 14:20',
    focus: '账单澄清 + 下月续约提醒',
    contacts: {
      phone: '186****2345',
      email: 'li.si@company.com',
      wechat: 'LiSi_fin',
    },
    sla: 'SLA-银牌服务',
    slaStatus: '有效',
    expire: '2024-03-31',
    products: ['结算中心', '发票管理', '财务报表导出'],
    metrics: {
      contractAmount: '¥86,000',
      satisfaction: '4.2/5.0',
      duration: '1年5个月',
    },
    insights: [
      {
        title: '计费透明度',
        desc: '最近 30 天账单问题高频，审批受阻；需要快速澄清计费口径。',
        action: '提供账单口径白名单+费用明细下载，并预约财务问答 30 分钟',
      },
      {
        title: '产品培训',
        desc: '报表模块培训后仍有长尾问题，建议补充快捷操作手册与录屏。',
        action: '推送 10 分钟短视频 + 常见 FAQ，确认是否需要二次培训',
      },
    ],
    interactions: [
      {
        title: '账单问题',
        desc: '上月账单核对',
        date: '2023-07-08',
        icon: 'fa-file-text-o',
        type: '沟通',
        window: '7d',
        channel: '企业QQ',
        result: '处理中',
      },
      {
        title: '产品培训',
        desc: '报表模块使用培训',
        date: '2023-06-20',
        icon: 'fa-graduation-cap',
        type: '服务',
        window: '30d',
        channel: '视频会议',
        result: '已完成',
      },
      {
        title: '问题解决',
        desc: '发票导出异常',
        date: '2023-05-30',
        icon: 'fa-check',
        type: '服务',
        window: '90d',
        channel: '电话',
        result: '已解决',
      },
    ],
    conversationHistory: [
      {
        id: 'conv-002-msg1',
        time: '2023-07-08 14:00',
        channel: '企业QQ',
        summary: '账单里有不明费用，需核对',
        detail: '希望核对计费区间与费用明细，影响审批进度',
        intent: '账单咨询',
        emotion: '中性',
        product: '结算中心',
        relatedServiceId: 'srv-bill-check',
      },
      {
        id: 'conv-002-msg2',
        time: '2023-06-20 10:00',
        channel: '视频会议',
        summary: '报表模块培训开场',
        detail: '需要 45 分钟培训，覆盖导出与过滤',
        intent: '培训',
        emotion: '正向',
        product: '报表模块',
        relatedServiceId: 'srv-report-training',
      },
    ],
    serviceRecords: [
      {
        id: 'srv-bill-check',
        title: '账单核对咨询',
        date: '2023-07-08',
        status: '已完成',
        promise: '账单答复1工作日',
        promiseStatus: '已达成',
        duration: '3小时内',
        owner: '财务支持',
        result: '澄清费用项并补发明细，客户确认无误',
        evidence: '邮件记录',
        commitmentId: 'promise-bill-sla',
        relatedConversations: ['conv-002-msg1'],
        actions: ['核对计费区间', '补发费用明细', '说明计算口径'],
        detail: '在 1 个工作日内完成核对与回复。',
        due: '1个工作日',
      },
      {
        id: 'srv-report-training',
        title: '报表模块培训',
        date: '2023-06-20',
        status: '已完成',
        promise: '季度培训/指导',
        promiseStatus: '已达成',
        duration: '45分钟',
        owner: '培训顾问',
        result: '完成线上培训并发送录屏',
        evidence: '培训录屏',
        commitmentId: 'promise-report-training',
        relatedConversations: ['conv-002-msg2'],
        actions: ['线上培训', '发送录屏', '整理FAQ'],
        detail: '完成合同约定的季度培训次数。',
        due: '季度内',
      },
    ],
    commitments: [
      {
        id: 'promise-bill-sla',
        title: '账单答复≤1工作日',
        metric: '账单争议 1 个工作日内澄清并回复',
        used: 1,
        total: 1,
        progress: 100,
        status: '达成',
        remark: '本次 3 小时内完成核对与回复',
        nextDue: '按需触发',
        risk: null,
      },
      {
        id: 'promise-report-training',
        title: '季度培训/指导',
        metric: '每季度至少 1 次培训或指导',
        used: 1,
        total: 4,
        progress: 25,
        status: '按计划',
        remark: 'Q2 已完成，Q3 待安排',
        nextDue: 'Q3 09-30 前',
        risk: '需排期',
      },
    ],
    history: [
      {
        id: 'hist-101',
        title: '账单核对咨询',
        date: '2023-07-08',
        status: '已解决',
        summary: '澄清费用项并补充报表导出指引',
        detail: '核对计费区间后，补发明细附件，客户确认无误。',
        transcript: [
          { time: '14:00', role: '客户', content: '账单里有一项不明费用。' },
          { time: '14:08', role: '工程师', content: '帮您核对计费区间，稍等。' },
          { time: '14:20', role: '工程师', content: '已补发费用明细，并附上导出说明。' },
        ],
        actions: ['核对计费区间', '补发费用明细', '发送导出说明'],
      },
      {
        id: 'hist-102',
        title: '报表模块培训',
        date: '2023-06-20',
        status: '已解决',
        summary: '线上培训 45 分钟，满意度 4.6',
        detail: '培训录屏已发送，FAQ整理到知识库。',
        transcript: [
          { time: '10:00', role: '工程师', content: '现在开始报表模块培训。' },
          { time: '10:40', role: '客户', content: '培训结束，录屏请发送。' },
        ],
        actions: ['进行线上培训', '发送录屏', '整理FAQ'],
      },
    ],
    contractRange: '2023-04-01 ~ 2024-03-31',
  },
  'conv-003': {
    name: '王五',
    title: '产品部 | 产品经理',
    tags: ['体验反馈', '近30天 2次服务', '功能咨询'],
    updatedAt: '2023-07-12 11:20',
    focus: '正向反馈转化为路线共创',
    contacts: {
      phone: '139****7788',
      email: 'wang.wu@company.com',
      wechat: 'WW_product',
    },
    sla: 'SLA-金牌服务',
    slaStatus: '有效',
    expire: '2023-12-31',
    products: ['企业ERP系统专业版', '产品需求管理'],
    metrics: {
      contractAmount: '¥120,000',
      satisfaction: '4.8/5.0',
      duration: '2年',
    },
    insights: [
      {
        title: '功能体验共创',
        desc: '近期多次反馈新功能体验好且有改进建议，适合邀请加入共创小组。',
        action: '发起共创邀请，安排路线评审，确认优先级与上线节奏',
      },
      {
        title: '权限优化需求',
        desc: '权限模块优化被多次提及，期望下季度优先排期。',
        action: '输出权限优化草案 + 时间表，设定阶段性反馈点',
      },
    ],
    interactions: [
      {
        title: '正向反馈',
        desc: '新功能体验反馈',
        date: '2023-07-12',
        icon: 'fa-smile-o',
        type: '沟通',
        window: '7d',
        channel: '飞书',
        result: '已记录',
      },
      {
        title: '需求沟通',
        desc: '迭代路线讨论',
        date: '2023-06-28',
        icon: 'fa-road',
        type: '沟通',
        window: '30d',
        channel: '视频会议',
        result: '进行中',
      },
      {
        title: '培训',
        desc: '团队使用培训',
        date: '2023-06-10',
        icon: 'fa-users',
        type: '服务',
        window: '90d',
        channel: '线上培训',
        result: '已完成',
      },
    ],
    conversationHistory: [
      {
        id: 'conv-003-msg1',
        time: '2023-07-12 11:02',
        channel: '飞书',
        summary: '新功能体验反馈与交互建议',
        detail: '反馈体验流畅，提出按钮位置与快捷键优化',
        intent: '产品反馈',
        emotion: '正向',
        product: '企业ERP系统专业版',
        relatedServiceId: 'srv-feature-feedback',
      },
      {
        id: 'conv-003-msg2',
        time: '2023-06-28 16:00',
        channel: '视频会议',
        summary: '迭代路线沟通，确认优先级',
        detail: '期望下季度优先做权限优化，约定后续评审',
        intent: '路线规划',
        emotion: '中性',
        product: '权限模块',
        relatedServiceId: 'srv-roadmap',
      },
    ],
    serviceRecords: [
      {
        id: 'srv-feature-feedback',
        title: '新功能体验回访',
        date: '2023-07-12',
        status: '已完成',
        promise: '体验反馈闭环',
        promiseStatus: '已达成',
        duration: '30分钟',
        owner: '产品经理',
        result: '收集交互建议并提交产品排期',
        evidence: '回访记录',
        commitmentId: 'promise-feedback',
        relatedConversations: ['conv-003-msg1'],
        actions: ['收集正向反馈', '整理交互建议', '提交产品排期'],
        detail: '回访完成并形成可执行的优化项。',
        due: '7天内闭环',
      },
      {
        id: 'srv-roadmap',
        title: '迭代路线沟通',
        date: '2023-06-28',
        status: '已记录',
        promise: '季度共创沟通',
        promiseStatus: '进行中',
        duration: '40分钟',
        owner: '产品经理',
        result: '确认优先级并准备 Roadmap 草案',
        evidence: '会议纪要',
        commitmentId: 'promise-coinnovation',
        relatedConversations: ['conv-003-msg2'],
        actions: ['讨论路线', '确认优先级', '安排下次评审'],
        detail: '已约定下次评审时间，等待产品草案',
        due: 'Q3 07-31 前',
      },
    ],
    commitments: [
      {
        id: 'promise-feedback',
        title: '体验反馈闭环',
        metric: '反馈后 7 天内形成结论或排期',
        used: 1,
        total: 4,
        progress: 25,
        status: '按计划',
        remark: '本次已提交排期，等待发布验证',
        nextDue: '按需触发',
        risk: null,
      },
      {
        id: 'promise-coinnovation',
        title: '季度共创/路线沟通',
        metric: '季度共创沟通≥1次，输出路线草案',
        used: 2,
        total: 4,
        progress: 50,
        status: '按计划',
        remark: 'Q2/Q3 已沟通，Q4 待排期',
        nextDue: 'Q4 12-31 前',
        risk: '需排期',
      },
    ],
    history: [
      {
        id: 'hist-201',
        title: '新功能使用反馈',
        date: '2023-07-12',
        status: '已解决',
        summary: '反馈新功能流畅，提出交互优化建议',
        detail: '记录了按钮位置与快捷键需求，已进入产品排期评估。',
        transcript: [
          { time: '11:02', role: '客户', content: '新功能很好用，有些按钮位置可以优化。' },
          { time: '11:15', role: '工程师', content: '收到，整理成优化建议提交产品。' },
        ],
        actions: ['收集正向反馈', '汇总交互建议', '提交产品排期'],
      },
      {
        id: 'hist-202',
        title: '迭代路线沟通',
        date: '2023-06-28',
        status: '已记录',
        summary: '讨论三季度版本计划，确认优先级',
        detail: '整理了 Roadmap 草案，并约定下一次评审时间。',
        transcript: [
          { time: '16:00', role: '客户', content: '希望下季度优先做权限优化。' },
          { time: '16:25', role: '工程师', content: '已记录优先级，准备Roadmap 草案。' },
        ],
        actions: ['讨论路线', '确认优先级', '安排下次评审'],
      },
    ],
    contractRange: '2023-01-01 ~ 2023-12-31',
  },
  'conv-004': {
    name: '赵六',
    title: '研发部 | 技术负责人',
    tags: ['API', '普通SLA', '近30天 1次服务'],
    updatedAt: '2023-07-18 09:30',
    focus: '密钥配置确认 + 限流策略回顾',
    contacts: {
      phone: '188****6677',
      email: 'zhaoliu@company.com',
      wechat: 'ZL_engineer',
    },
    sla: 'SLA-银牌服务',
    slaStatus: '即将到期',
    expire: '2023-10-31',
    products: ['开放平台 API', '认证网关', '监控告警'],
    metrics: {
      contractAmount: '¥76,000',
      satisfaction: '4.1/5.0',
      duration: '11个月',
    },
    insights: [
      {
        title: '接入与安全',
        desc: '申请新 API 密钥且需确认绑定 IP，安全基线需明确。',
        action: '提供白名单模板+回收旧密钥，确认上线窗口与回退方案',
      },
      {
        title: '性能与限流',
        desc: '限流阈值调整后需跟踪告警回落，避免再次抖动。',
        action: '设置 7 天随访并复盘指标，推送性能告警订阅',
      },
    ],
    interactions: [
      {
        title: 'API密钥申请',
        desc: '新增密钥与权限配置',
        date: '2023-07-18',
        icon: 'fa-key',
        type: '服务',
        window: '7d',
        channel: '飞书',
        result: '进行中',
      },
      {
        title: '性能问题',
        desc: '限流阈值调整',
        date: '2023-06-30',
        icon: 'fa-tachometer',
        type: '沟通',
        window: '30d',
        channel: '电话',
        result: '已解决',
      },
      {
        title: '上线支持',
        desc: '灰度发布协助',
        date: '2023-06-05',
        icon: 'fa-cloud-upload',
        type: '服务',
        window: '90d',
        channel: '飞书',
        result: '已完成',
      },
    ],
    conversationHistory: [
      {
        id: 'conv-004-msg1',
        time: '2023-07-18 09:10',
        channel: '飞书',
        summary: '需要新的 API 密钥并配置权限',
        detail: '希望获取新密钥，明确绑定 IP 与环境',
        intent: '接入/申请',
        emotion: '中性',
        product: '开放平台 API',
        relatedServiceId: 'srv-api-key',
      },
      {
        id: 'conv-004-msg2',
        time: '2023-06-30 15:30',
        channel: '电话',
        summary: '限流触发过多，需调整阈值',
        detail: '希望调高阈值并查看告警情况',
        intent: '性能咨询',
        emotion: '中性',
        product: '认证网关/限流',
        relatedServiceId: 'srv-throttle',
      },
    ],
    serviceRecords: [
      {
        id: 'srv-api-key',
        title: 'API 密钥申请指引',
        date: '2023-07-18',
        status: '进行中',
        promise: '标准接入指引与配置确认',
        promiseStatus: '进行中',
        duration: '-',
        owner: '技术支持',
        result: '提供申请指引与权限模板，等待客户确认',
        evidence: '指引文档',
        commitmentId: 'promise-api-access',
        relatedConversations: ['conv-004-msg1'],
        actions: ['发送指引', '准备权限模板', '等待客户确认'],
        detail: '待客户确认绑定 IP 与环境后完成交付',
        due: '3天内完成配置',
      },
      {
        id: 'srv-throttle',
        title: '限流策略咨询',
        date: '2023-06-30',
        status: '已解决',
        promise: '性能保障咨询',
        promiseStatus: '已达成',
        duration: '30分钟',
        owner: '技术支持',
        result: '调高阈值并验证告警下降',
        evidence: '日志与指标截图',
        commitmentId: 'promise-performance',
        relatedConversations: ['conv-004-msg2'],
        actions: ['检查限流日志', '调高阈值', '验证告警下降'],
        detail: '性能指标恢复，429 告警下降',
        due: '当天内响应',
      },
    ],
    commitments: [
      {
        id: 'promise-api-access',
        title: 'API 接入指引时效',
        metric: '3 天内完成新密钥配置与权限确认',
        used: 0,
        total: 1,
        progress: 0,
        status: '进行中',
        remark: '等待客户确认 IP 与环境',
        nextDue: '3 天内完成',
        risk: '需跟进',
      },
      {
        id: 'promise-performance',
        title: '性能保障咨询',
        metric: '性能咨询当日响应并给出处理方案',
        used: 1,
        total: 4,
        progress: 25,
        status: '达成',
        remark: '当日完成调优，告警下降',
        nextDue: '按需触发',
        risk: null,
      },
    ],
    history: [
      {
        id: 'hist-301',
        title: 'API密钥申请指引',
        date: '2023-07-18',
        status: '进行中',
        summary: '指导完成密钥申请并配置权限',
        detail: '准备了 API 权限模板，等待客户确认绑定IP与环境。',
        transcript: [
          { time: '09:10', role: '客户', content: '需要新的API密钥。' },
          { time: '09:18', role: '工程师', content: '发您申请指引，并准备权限模板。' },
        ],
        actions: ['发送密钥申请指引', '准备权限模板', '等待客户确认'],
      },
      {
        id: 'hist-302',
        title: '限流策略咨询',
        date: '2023-06-30',
        status: '已解决',
        summary: '调高阈值并验证 429 告警下降',
        detail: '同步了分租户限流建议，并验证RT回落正常。',
        transcript: [
          { time: '15:30', role: '客户', content: '限流触发过多，想调整阈值。' },
          { time: '15:45', role: '工程师', content: '已调高阈值并观察告警。' },
        ],
        actions: ['检查限流日志', '调高阈值', '验证告警下降'],
      },
    ],
    contractRange: '2022-11-01 ~ 2023-10-31',
  },
  'conv-005': {
    name: '孙七',
    title: '运营部 | 运维经理',
    tags: ['紧急', '数据同步', '近30天 2次服务'],
    updatedAt: '2023-07-19 09:10',
    focus: '数据回放进度跟踪',
    contacts: {
      phone: '137****8899',
      email: 'sunqi@company.com',
      wechat: 'SunOps',
    },
    sla: 'SLA-金牌服务',
    slaStatus: '有效',
    expire: '2024-05-20',
    products: ['数据同步引擎', '日志中心', '监控告警'],
    metrics: {
      contractAmount: '¥135,000',
      satisfaction: '4.0/5.0',
      duration: '1年8个月',
    },
    insights: [
      {
        title: '数据完整性风险',
        desc: '重大数据丢失恢复中，需在 4 小时窗口内补齐并验证。',
        action: '实时同步回放进度，准备验证脚本与佐证截图',
      },
      {
        title: '性能与容量',
        desc: '近期链路延迟、堆积问题频发，需评估容量与限流策略。',
        action: '安排容量评估 + 夜间任务调优，输出加固计划',
      },
    ],
    interactions: [
      {
        title: '告警处理',
        desc: '数据同步异常告警',
        date: '2023-07-19',
        icon: 'fa-bell',
        type: '服务',
        window: '7d',
        channel: '电话',
        result: '进行中',
      },
      {
        title: '根因分析',
        desc: '链路丢失排查',
        date: '2023-07-02',
        icon: 'fa-search',
        type: '沟通',
        window: '30d',
        channel: '飞书',
        result: '已解决',
      },
      {
        title: '性能优化',
        desc: '夜间任务调优',
        date: '2023-06-12',
        icon: 'fa-line-chart',
        type: '服务',
        window: '90d',
        channel: '线上会议',
        result: '已完成',
      },
    ],
    conversationHistory: [
      {
        id: 'conv-005-msg1',
        time: '2023-07-19 08:40',
        channel: '电话',
        summary: '同步后有数据丢失，需紧急处理',
        detail: '批处理失败导致数据缺失，要求尽快回放数据',
        intent: '故障反馈',
        emotion: '紧急',
        product: '数据同步引擎',
        relatedServiceId: 'srv-sync',
      },
      {
        id: 'conv-005-msg2',
        time: '2023-07-02 14:15',
        channel: '飞书',
        summary: '链路延迟高，影响业务',
        detail: '消息堆积导致延迟，需要扩容与优化',
        intent: '性能问题',
        emotion: '不满',
        product: '监控告警/链路',
        relatedServiceId: 'srv-link',
      },
    ],
    serviceRecords: [
      {
        id: 'srv-sync',
        title: '数据同步异常回放',
        date: '2023-07-19',
        status: '进行中',
        promise: '重大数据问题4小时内恢复',
        promiseStatus: '进行中',
        duration: '-',
        owner: '数据团队',
        result: '定位批处理失败，正在回放最近 2 小时数据',
        evidence: '回放进度截图',
        commitmentId: 'promise-data-restore',
        relatedConversations: ['conv-005-msg1'],
        actions: ['定位批处理失败', '回放数据', '核对数据完整性'],
        detail: '预计 2 小时内完成回放与校验',
        due: '4 小时内恢复',
      },
      {
        id: 'srv-link',
        title: '链路丢失排查',
        date: '2023-07-02',
        status: '已解决',
        promise: '性能保障',
        promiseStatus: '已达成',
        duration: '40分钟',
        owner: '数据团队',
        result: '清理堆积并扩容分区，延迟恢复',
        evidence: '指标截图',
        commitmentId: 'promise-performance-ops',
        relatedConversations: ['conv-005-msg2'],
        actions: ['检查消息堆积', '扩容分区/消费者', '验证延迟恢复'],
        detail: '延迟恢复至正常阈值，满意度回升',
        due: '当天内响应',
      },
    ],
    commitments: [
      {
        id: 'promise-data-restore',
        title: '重大数据问题 4 小时内恢复',
        metric: '重大数据丢失/阻塞，4 小时内恢复并补齐',
        used: 0,
        total: 2,
        progress: 0,
        status: '进行中',
        remark: '当前事件在恢复中，需关注回放进度',
        nextDue: '4 小时内完成',
        risk: '需盯紧进度',
      },
      {
        id: 'promise-performance-ops',
        title: '性能保障咨询',
        metric: '性能/延迟问题当日响应并给出方案',
        used: 1,
        total: 4,
        progress: 25,
        status: '达成',
        remark: '链路延迟当天解决，指标恢复正常',
        nextDue: '按需触发',
        risk: null,
      },
    ],
    history: [
      {
        id: 'hist-401',
        title: '数据同步异常',
        date: '2023-07-19',
        status: '进行中',
        summary: '部分信息丢失，正在回放补数据',
        detail: '锁定到批处理任务失败，正在回放最近2小时数据。',
        transcript: [
          { time: '08:40', role: '客户', content: '同步后有数据丢失。' },
          { time: '08:50', role: '工程师', content: '发现批处理失败，正在回放数据。' },
        ],
        actions: ['定位批处理失败', '回放数据', '核对数据完整性'],
      },
      {
        id: 'hist-402',
        title: '链路丢失排查',
        date: '2023-07-02',
        status: '已解决',
        summary: '修复消息堆积导致的延迟',
        detail: '调整 Kafka 分区与消费者并验证恢复，客户满意度回升。',
        transcript: [
          { time: '14:15', role: '客户', content: '链路延迟高。' },
          { time: '14:35', role: '工程师', content: '清理堆积并扩容分区，延迟恢复。' },
        ],
        actions: ['检查消息堆积', '扩容分区/消费者', '验证延迟恢复'],
      },
    ],
    contractRange: '2022-10-01 ~ 2024-05-20',
  },
};

export function initCustomerProfile() {
  bindInteractionFilters();
  updateCustomerContext('conv-001');
  bindHistoryDetails();
}

export function updateCustomerContext(conversationId) {
  currentConversationId = conversationId || 'conv-001';
  const profile = profiles[conversationId] || profiles['conv-001'];
  renderProfile(profile);
  renderConversationTimeline(profile);
  renderCommitmentSummary(profile);
  renderServiceRecords(profile);
  renderContractRange(profile.contractRange);
  bindHistoryDetails();
}

function renderProfile(profile) {
  setText('#customer-name', profile.name);
  setText('#customer-title', profile.title);
  setText('#customer-phone', profile.contacts.phone);
  setText('#customer-email', profile.contacts.email);
  setText('#customer-wechat', profile.contacts.wechat);
  setText('#customer-sla', profile.sla);
  setText('#customer-sla-status', profile.slaStatus);
  setText('#customer-expire', profile.expire);
  setText('#customer-sla-duplicate', profile.sla);
  setText('#customer-sla-status-duplicate', profile.slaStatus);
  setText('#customer-expire-duplicate', profile.expire);
  setText('#customer-contract-amount', profile.metrics.contractAmount);
  setText('#customer-satisfaction', profile.metrics.satisfaction);
  setText('#customer-duration', profile.metrics.duration);
  setText('#customer-focus', profile.focus || '保持本周触达');
  setText('#customer-updated-at-secondary', profile.updatedAt || '-');
  setText('#customer-expire-secondary', profile.expire || '-');

  const updatedAt = qs('#customer-updated-at');
  if (updatedAt) {
    updatedAt.textContent = `数据刷新：${profile.updatedAt || '-'}`;
  }

  const tagWrap = qs('#customer-tags');
  if (tagWrap) {
    tagWrap.innerHTML = '';
    (profile.tags || []).forEach((tag) => {
      const chip = document.createElement('div');
      chip.className = 'analysis-chip chip-soft w-full justify-center';
      chip.textContent = tag;
      tagWrap.appendChild(chip);
    });
  }

  const productList = qs('#customer-products');
  if (productList) {
    productList.innerHTML = '';
    (profile.products || []).forEach((p) => {
      const li = document.createElement('li');
      li.textContent = p;
      productList.appendChild(li);
    });
  }

  renderInsights(profile);
  renderInteractions(profile);
}

function renderInsights(profile) {
  const wrap = qs('#customer-insights');
  if (!wrap) return;
  const insights = profile.insights || [];
  wrap.innerHTML = '';

  if (!insights.length) {
    wrap.innerHTML =
      '<div class="placeholder-card text-xs text-gray-600">暂无洞察，待画像平台对接后展示。</div>';
    return;
  }

  insights.forEach((item) => {
    wrap.insertAdjacentHTML(
      'beforeend',
      `
        <div class="insight-card">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-sm font-semibold text-gray-800">${item.title}</div>
              <p class="text-xs text-gray-600 mt-1">${item.desc}</p>
            </div>
            <span class="chip-ghost">当前</span>
          </div>
          <div class="mt-2 inline-flex items-center gap-1 insight-action">
            <i class="fa fa-bolt text-xs"></i>
            <span>${item.action || '待确认下一步'}</span>
          </div>
        </div>
      `
    );
  });
}

function renderInteractions(profile) {
  const container = qs('#customer-interactions');
  if (!container) return;
  container.innerHTML = '';

  const list = profile.interactions || [];
  const filtered = list.filter((item) => {
    const type = item.type || '全部';
    const windowTag = item.window || 'all';
    const typeMatch = interactionFilter.type === '全部' || interactionFilter.type === type;
    const rangeMatch = interactionFilter.range === 'all' || interactionFilter.range === windowTag;
    return typeMatch && rangeMatch;
  });

  if (!filtered.length) {
    container.innerHTML =
      '<div class="interaction-card col-span-3 text-xs text-gray-600 bg-gray-50 border border-dashed border-gray-200">当前筛选时间窗暂无互动，可切换为“全部”查看。</div>';
    return;
  }

  filtered.forEach((item) => {
    container.insertAdjacentHTML(
      'beforeend',
      `
        <div class="interaction-card">
          <div class="flex items-start gap-2">
            <div class="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-primary">
              <i class="fa ${item.icon}"></i>
            </div>
            <div class="flex-1">
              <div class="flex justify-between items-start text-xs text-gray-500">
                <span>${item.title}</span>
                <span>${item.date}</span>
              </div>
              <p class="text-sm text-gray-800 mt-1">${item.desc}</p>
              <div class="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-600">
                <span class="chip-soft">类型：${item.type || '未标注'}</span>
                <span class="chip-soft">渠道：${item.channel || '-'}</span>
                <span class="chip-soft ${interactionStatusClass(item.result)}">${item.result || '未标注'}</span>
              </div>
            </div>
          </div>
        </div>
      `
    );
  });
}

function renderConversationTimeline(profile) {
  const container = qs('#conversation-timeline');
  if (!container) return;
  container.innerHTML = '';

  const timeline = profile.conversationHistory || [];
  const serviceMap = (profile.serviceRecords || []).reduce((acc, cur) => {
    acc[cur.id] = cur;
    return acc;
  }, {});

  if (!timeline.length) {
    container.innerHTML =
      '<div class="history-empty bg-gray-50 border border-dashed border-gray-200 p-3 rounded-lg text-xs text-gray-600">暂无沟通记录</div>';
    return;
  }

  timeline.forEach((item, idx) => {
    const relatedService = item.relatedServiceId ? serviceMap[item.relatedServiceId] : null;
    const serviceAction = relatedService
      ? `<button class="text-[11px] text-primary hover:underline" data-service-id="${relatedService.id}">关联服务：${relatedService.title}</button>`
      : '<span class="text-[11px] text-gray-400">未关联服务</span>';

    const jumpLabel = item.anchorLabel || item.summary;
    const isLast = idx === timeline.length - 1;
    container.insertAdjacentHTML(
      'beforeend',
      `
      <div class="timeline-row">
        <div class="timeline-line ${isLast ? 'timeline-line-end' : ''}"></div>
        <div class="timeline-dot timeline-dot-comm"></div>
        <div class="timeline-card">
          <div class="flex justify-between items-start gap-2">
            <div class="flex items-center gap-2">
              <span class="badge-soft">沟通</span>
              <span class="text-sm font-medium">${item.summary}</span>
            </div>
            <span class="text-[11px] text-gray-500">${item.time}</span>
          </div>
          <p class="text-xs text-gray-600 mt-1">${item.detail || '暂无描述'}</p>
          <div class="flex flex-wrap gap-2 mt-2 text-[11px] text-gray-500">
            <span class="chip-soft">渠道：${item.channel || '-'}</span>
            <span class="chip-soft">意图：${item.intent || '-'}</span>
            <span class="chip-soft">情绪：${item.emotion || '-'}</span>
            <span class="chip-soft">产品：${item.product || '未标注'}</span>
            ${serviceAction}
            <button class="text-[11px] text-primary hover:underline" data-jump-label="${jumpLabel}">定位对话</button>
          </div>
        </div>
      </div>
    `
    );
  });
}

function renderCommitmentSummary(profile) {
  const wrap = qs('#commitment-summary');
  const alertWrap = qs('#commitment-alerts');
  if (!wrap || !alertWrap) return;
  wrap.innerHTML = '';
  alertWrap.innerHTML = '';

  const commitments = profile.commitments || [];
  if (!commitments.length) {
    wrap.innerHTML =
      '<div class="history-empty bg-gray-50 border border-dashed border-gray-200 p-3 rounded-lg text-xs text-gray-600 col-span-3">暂无承诺数据</div>';
    alertWrap.innerHTML =
      '<div class="history-empty bg-gray-50 border border-dashed border-gray-200 p-3 rounded-lg text-xs text-gray-600">暂无异常或预警</div>';
    return;
  }

  commitments.forEach((c) => {
    const progress =
      typeof c.progress === 'number'
        ? c.progress
        : Math.min(100, Math.round(((c.used || 0) / (c.total || 1)) * 100));
    wrap.insertAdjacentHTML(
      'beforeend',
      `
      <div class="commit-card">
        <div class="flex justify-between items-start gap-2">
          <div>
            <div class="text-sm font-semibold text-gray-800">${c.title}</div>
            <p class="text-xs text-gray-600 mt-1">${c.metric}</p>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded-full ${commitmentStatusClass(c.status, c.risk)}">${c.status || '进行中'}</span>
        </div>
        <div class="mt-2 text-[11px] text-gray-500 flex justify-between">
          <span>已用：${c.used ?? 0}/${c.total ?? '-'}</span>
          <span>下一节点：${c.nextDue || '-'}</span>
        </div>
        <div class="progress mt-2">
          <div class="progress-bar" style="width:${progress}%"></div>
        </div>
        <div class="text-[11px] text-gray-600 mt-2">${c.remark || '暂无备注'}</div>
      </div>
    `
    );
  });

  const risky = commitments.filter((c) => c.status === '预警' || c.status === '延期' || c.risk);
  if (!risky.length) {
    alertWrap.innerHTML =
      '<div class="history-empty bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs p-3 rounded-lg">暂无异常或预警</div>';
  } else {
    risky.forEach((c) => {
      alertWrap.insertAdjacentHTML(
        'beforeend',
        `<div class="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg flex justify-between items-center">
          <div>
            <div class="font-medium">${c.title}</div>
            <div class="text-[11px] text-amber-700 mt-1">${c.remark || '存在风险，请跟进'}</div>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">需跟进</span>
        </div>`
      );
    });
  }
}

function renderServiceRecords(profile) {
  const container = qs('#service-records');
  const commitmentFilter = qs('#service-commitment-filter');
  const statusFilter = qs('#service-status-filter');
  if (!container) return;

  const conversationMap = (profile.conversationHistory || []).reduce((acc, cur) => {
    acc[cur.id] = cur;
    acc[cur.summary] = cur;
    return acc;
  }, {});

  const records = [...(profile.serviceRecords || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (commitmentFilter) {
    const prevValue = commitmentFilter.value;
    commitmentFilter.innerHTML = '<option value="全部">全部承诺</option>';
    (profile.commitments || []).forEach((c) => {
      commitmentFilter.insertAdjacentHTML(
        'beforeend',
        `<option value="${c.id}">${c.title}</option>`
      );
    });
    if (prevValue && Array.from(commitmentFilter.options).some((o) => o.value === prevValue)) {
      commitmentFilter.value = prevValue;
    }
  }

  const statusVal = statusFilter?.value || '全部';
  const commitmentVal = commitmentFilter?.value || '全部';
  const filtered = records.filter((rec) => {
    const statusMatch =
      statusVal === '全部' || rec.status === statusVal || (statusVal === '已完成' && rec.status === '已解决');
    const commitmentMatch = commitmentVal === '全部' || rec.commitmentId === commitmentVal;
    return statusMatch && commitmentMatch;
  });

  container.innerHTML = '';
  if (!filtered.length) {
    container.innerHTML =
      '<div class="history-empty bg-gray-50 border border-dashed border-gray-200 p-3 rounded-lg text-xs text-gray-600">暂无符合条件的服务记录</div>';
    return;
  }

  filtered.forEach((rec) => {
    const relatedLabels = (rec.relatedConversations || []).map(
      (c) => conversationMap[c]?.anchorLabel || conversationMap[c]?.summary || c
    );
    container.insertAdjacentHTML(
      'beforeend',
      `
      <div class="service-card">
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded-full ${serviceStatusClass(rec.status)}">${rec.status || '进行中'}</span>
              <span class="text-sm font-semibold">${rec.title}</span>
            </div>
            <p class="text-xs text-gray-600 mt-1">${rec.result || rec.detail || '暂无描述'}</p>
            <div class="text-[11px] text-gray-500 mt-1">承诺：${rec.promise || '未映射'} · 状态：${rec.promiseStatus || '未判定'}</div>
          </div>
          <div class="text-right text-[11px] text-gray-500 space-y-1">
            <div>${rec.date || '-'}</div>
            <div>耗时：${rec.duration || '-'}</div>
            <div>负责人：${rec.owner || '-'}</div>
            <button class="text-primary hover:underline" data-service-id="${rec.id}">查看详情</button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 mt-2 text-[11px] text-gray-600">
          <span class="chip-soft">承诺ID：${rec.commitmentId || '未关联'}</span>
          <span class="chip-soft">截至：${rec.due || '-'}</span>
          ${relatedLabels
            .map(
              (c) =>
                `<span class="chip-soft" data-jump-label="${c}" title="定位到关联沟通">关联沟通 · ${c}</span>`
            )
            .join('')}
        </div>
      </div>
    `
    );
  });
}

function renderContractRange(range) {
  setText('#contract-range', range || '-');
}

function interactionStatusClass(status) {
  if (!status) return '';
  if (status.includes('解决') || status.includes('完成')) return 'chip-success';
  if (status.includes('进行') || status.includes('处理中')) return 'chip-info';
  return 'chip-neutral';
}

function serviceStatusClass(status) {
  if (status === '已完成' || status === '已解决') return 'bg-green-100 text-green-800';
  if (status === '进行中') return 'bg-blue-100 text-blue-800';
  if (status === '未开始') return 'bg-gray-100 text-gray-800';
  return 'bg-gray-100 text-gray-800';
}

function commitmentStatusClass(status, risk) {
  if (status === '达成') return 'bg-green-100 text-green-800';
  if (status === '按计划' || status === '进行中') return 'bg-blue-100 text-blue-800';
  if (status === '预警' || risk) return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-800';
}

function getCurrentProfile() {
  return profiles[currentConversationId] || profiles['conv-001'];
}

let historyBound = false;
function bindInteractionFilters() {
  if (interactionFilterBound) return;
  const range = qs('#interaction-range-filter');
  const type = qs('#interaction-type-filter');
  if (range) {
    interactionFilter.range = range.value || interactionFilter.range;
    on(range, 'change', () => {
      interactionFilter.range = range.value;
      renderInteractions(getCurrentProfile());
    });
  }
  if (type) {
    interactionFilter.type = type.value || interactionFilter.type;
    on(type, 'change', () => {
      interactionFilter.type = type.value;
      renderInteractions(getCurrentProfile());
    });
  }
  interactionFilterBound = true;
}

function bindHistoryDetails() {
  if (historyBound) return;
  const timeline = qs('#conversation-timeline');
  const services = qs('#service-records');
  const statusFilter = qs('#service-status-filter');
  const commitmentFilter = qs('#service-commitment-filter');

  if (timeline) {
    on(timeline, 'click', (e) => {
      const jumpBtn = e.target.closest('[data-jump-label]');
      const svcBtn = e.target.closest('[data-service-id]');
      if (svcBtn) {
        openHistoryDetail(svcBtn.getAttribute('data-service-id'));
        return;
      }
      if (jumpBtn) {
        toggleRightSidebar(false);
        scrollToChatByLabel(jumpBtn.getAttribute('data-jump-label'));
      }
    });
  }

  if (services) {
    on(services, 'click', (e) => {
      const svcBtn = e.target.closest('[data-service-id]');
      const jumpBtn = e.target.closest('[data-jump-label]');
      if (svcBtn) {
        openHistoryDetail(svcBtn.getAttribute('data-service-id'));
      } else if (jumpBtn) {
        toggleRightSidebar(false);
        scrollToChatByLabel(jumpBtn.getAttribute('data-jump-label'));
      }
    });
  }

  if (statusFilter) {
    on(statusFilter, 'change', () => renderServiceRecords(getCurrentProfile()));
  }
  if (commitmentFilter) {
    on(commitmentFilter, 'change', () => renderServiceRecords(getCurrentProfile()));
  }

  historyBound = true;
}

export function openHistoryDetail(label) {
  const profile = getCurrentProfile();
  const service =
    (profile.serviceRecords || []).find((s) => s.id === label || s.title === label) || null;
  const conversation =
    (profile.conversationHistory || []).find(
      (c) => c.id === label || c.summary === label || c.anchorLabel === label
    ) || null;
  const legacy =
    (profile.history || []).find((h) => h.id === label || h.title === label) || null;

  const item = service || conversation || legacy;
  if (item) openHistoryModal(item);
}

function openHistoryModal(item) {
  const overlay = qs('#action-modal-overlay');
  const modalTitle = qs('#action-modal-title');
  const modalBody = qs('#action-modal-body');
  const primaryBtn = qs('#action-modal-primary');
  if (!overlay || !modalTitle || !modalBody || !primaryBtn) return;

  const isService = Boolean(item.promise || item.commitmentId);
  const isConversation = Boolean(item.intent);
  const statusText = item.status || (isConversation ? '沟通' : '记录');

  modalTitle.textContent = `${isService ? '服务记录' : '沟通记录'}：${item.title || item.summary}`;
  modalBody.innerHTML = `
    <div class="history-summary group relative flex items-start gap-2 mb-1">
      <p class="text-sm text-gray-700 flex-1">${item.result || item.summary || item.detail || '暂无描述'}</p>
      <button class="jump-to-chat opacity-0 group-hover:opacity-100 text-primary text-xs flex items-center gap-1 transition-opacity" data-jump-label="${item.anchorLabel || item.summary || item.title || ''}" title="定位到对话">
        <i class="fa fa-share-square-o"></i> 定位
      </button>
    </div>
    <p class="text-xs text-gray-500">
      日期：${item.date || '-'}
      · 状态：${statusText}
      ${item.promise ? `· 承诺：${item.promise}（${item.promiseStatus || '未判定'}）` : ''}
    </p>
    <div class="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed">
      ${item.detail || item.result || '暂无详情'}
    </div>
    ${
      isService
        ? `<div class="mt-3">
            <h4 class="text-xs font-medium text-gray-600 mb-2">处理动作</h4>
            <ul class="list-disc pl-5 space-y-1 text-xs text-gray-700">
              ${(item.actions || []).map((act) => `<li>${act}</li>`).join('') || '<li>暂无记录</li>'}
            </ul>
            <div class="text-[11px] text-gray-500 mt-2">负责人：${item.owner || '-'} · 耗时：${
            item.duration || '-'
          } · 截止/目标：${item.due || '-'}</div>
            <div class="text-[11px] text-gray-500 mt-1">证据/附件：${
              item.evidence || '未上传'
            }</div>
          </div>`
        : ''
    }
    ${
      item.transcript
        ? `<div class="mt-3">
            <h4 class="text-xs font-medium text-gray-600 mb-2">对话摘录</h4>
            <div class="space-y-2">
              ${(item.transcript || [])
                .map(
                  (msg) =>
                    `<div class="flex items-start text-xs text-gray-700 bg-white border border-gray-100 rounded p-2">
                      <span class="text-[11px] text-gray-500 w-12">${msg.time}</span>
                      <span class="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full mr-2">${msg.role}</span>
                      <span class="flex-1">${msg.content}</span>
                    </div>`
                )
                .join('') || '<div class="text-xs text-gray-500">暂无记录</div>'}
            </div>
          </div>`
        : ''
    }
  `;
  primaryBtn.classList.add('hidden');
  primaryBtn.onclick = null;
  overlay.classList.remove('hidden');

  const jumpBtn = modalBody.querySelector('.jump-to-chat');
  if (jumpBtn) {
    on(jumpBtn, 'click', () => {
      overlay.classList.add('hidden');
      toggleRightSidebar(false);
      scrollToChatByLabel(jumpBtn.getAttribute('data-jump-label'));
    });
  }
}

function scrollToChatByLabel(label) {
  const chat = qs('#chat-messages');
  if (!chat) return;
  const target = chat.querySelector(`[data-history-label="${label}"]`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('history-highlight');
    setTimeout(() => target.classList.remove('history-highlight'), 1000);
  } else {
    chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  }
}

function setText(selector, value) {
  const el = qs(selector);
  if (el) el.textContent = value || '-';
}
