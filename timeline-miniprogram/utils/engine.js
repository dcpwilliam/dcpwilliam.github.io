/**
 * 需求解析 + 未来选择生成引擎
 * 输入一句话需求 -> 解析出目标/领域/时限 -> 生成三条未来路径（含达成概率）
 * -> 选中某条后展开为七天行动时间线
 */
const date = require('./date.js')

/* ------------------------------ 领域词库 ------------------------------ */

const GENERIC = {
  key: 'generic',
  name: '通用目标',
  color: '#5B6CFF',
  match: [],
  routes: [
    {
      tag: '稳健',
      name: '拆解推进',
      emoji: '🧭',
      way: '把大目标切成每天 30 分钟就能推进的小块，按部就班',
      base: 63,
      cost: '每天约 35 分钟',
      risk: '节奏偏慢，中途容易失去新鲜感',
      plan: [
        { p: '启动', t: '把「{goal}」写成一句可验收的目标', tip: '有数字、有截止日、有验收方式，才叫目标', m: 20 },
        { p: '拆解', t: '拆出 5 个可独立完成的最小步骤', tip: '每步都能在 60 分钟内做完，否则继续拆', m: 25 },
        { p: '布局', t: '把第一步排进明天的固定时段', tip: '写进日历，比「有空就做」成功率高 2 倍', m: 15 },
        { p: '执行', t: '完成第一步，只求完成不求完美', tip: '先做出 60 分版本，再迭代', m: 40 },
        { p: '执行', t: '完成第二、第三步', tip: '连续两天推进，惯性就开始形成', m: 45 },
        { p: '调整', t: '复盘卡住的地方，换一种做法再试', tip: '卡住往往是方法问题，不是意志力问题', m: 30 },
        { p: '复盘', t: '周度回顾：完成率、障碍、下周计划', tip: '只调流程，不自我批评', m: 30 }
      ]
    },
    {
      tag: '激进',
      name: '全力压上',
      emoji: '🔥',
      way: '短期投入大量时间资源，用强度换速度',
      base: 47,
      cost: '每天 2 小时以上',
      risk: '容易透支，第 4–5 天是放弃高发期',
      plan: [
        { p: '启动', t: '为「{goal}」锁定一个不可退让的截止点', tip: '公开承诺比私下决心更管用', m: 20 },
        { p: '布局', t: '清空日程，把这一周让给这个目标', tip: '提前推掉可有可无的安排', m: 25 },
        { p: '执行', t: '集中攻克最难的那 20% 关键动作', tip: '先啃硬骨头，剩余部分会加速', m: 120 },
        { p: '执行', t: '完成第一轮完整产出', tip: '不打磨，先看整体是否成立', m: 120 },
        { p: '执行', t: '收集 3 个外部反馈并快速修改', tip: '外部视角能一次性暴露盲点', m: 90 },
        { p: '调整', t: '强制休息半天，检查身体与情绪信号', tip: '冲刺阶段最怕的是隐性透支', m: 30 },
        { p: '复盘', t: '评估是否值得继续高强度，还是转入稳态', tip: '冲刺是手段，不是常态', m: 40 }
      ]
    },
    {
      tag: '巧劲',
      name: '绕道破局',
      emoji: '🪄',
      way: '不硬碰硬，先换系统、换场景、借外力',
      base: 58,
      cost: '每天约 20 分钟 + 一次社交投入',
      risk: '见效路径不直观，需要一点耐心',
      plan: [
        { p: '启动', t: '写下过去三次没做成「{goal}」的真实原因', tip: '诚实比乐观有用', m: 20 },
        { p: '拆解', t: '找出那个真正的瓶颈环节', tip: '80% 的拖延卡在同一个环节上', m: 25 },
        { p: '布局', t: '找一个已经做到的人，请教一条具体经验', tip: '一条经验胜过十篇攻略', m: 30 },
        { p: '执行', t: '把目标绑定到已有习惯上（顺手做）', tip: '绑定越牢，越不需要意志力', m: 20 },
        { p: '执行', t: '改造环境：让好行为更容易发生', tip: '把触发物放在视线里，把干扰物移出房间', m: 30 },
        { p: '调整', t: '设置一次公开打卡或小额对赌', tip: '外部约束能顶住内部波动', m: 20 },
        { p: '复盘', t: '用「系统是否变好」而不是「结果是否达成」评判', tip: '系统对了，结果是时间问题', m: 25 }
      ]
    }
  ]
}

const CATEGORIES = [
  {
    key: 'fitness',
    name: '健康塑形',
    color: '#FF7A59',
    match: ['减重', '减肥', '瘦身', '减脂', '健身', '跑步', '跑了', '马甲线', '腹肌', '增肌', '体重', '斤', '公斤', '锻炼', '运动', '快走', '游泳', '骑行', '拉伸', '体脂', '睡眠', '戒烟', '熬夜', '早睡', '马拉松', '爬山', '瑜伽'],
    routes: [
      {
        tag: '稳健',
        name: '稳态燃脂',
        emoji: '🧭',
        way: '每天固定 40 分钟训练 + 约 300kcal 热量缺口',
        base: 66,
        cost: '每天约 45 分钟',
        risk: '见效慢，前两周体重会上下波动',
        plan: [
          { p: '启动', t: '为「{goal}」做一次基线盘点', tip: '体重、腰围、体脂、日常步数各记一遍', m: 20 },
          { p: '布局', t: '定下每周 4 次、每次 40 分钟的训练时段', tip: '写进日历，不靠临时起意', m: 15 },
          { p: '执行', t: '第一次 40 分钟有氧 + 20 分钟力量', tip: '强度以「能说话但不轻松」为准', m: 60 },
          { p: '执行', t: '记录三餐，制造约 300kcal 缺口', tip: '先砍油糖和夜宵，主食别一刀切', m: 30 },
          { p: '调整', t: '复盘三天数据，微调一次训练强度', tip: '关节不适就退到快走或椭圆机', m: 25 },
          { p: '执行', t: '加一次抗阻训练保住基础代谢', tip: '深蹲、划船、推举各 3 组', m: 45 },
          { p: '复盘', t: '周度称重 + 制定下一周计划', tip: '一周掉 0.3–0.8kg 是健康区间', m: 30 }
        ]
      },
      {
        tag: '激进',
        name: '极限加压',
        emoji: '🔥',
        way: '每日 60–90 分钟训练 + 严格饮食控制',
        base: 45,
        cost: '每天 90 分钟以上',
        risk: '恢复不足，第 4–5 天最容易反弹或受伤',
        plan: [
          { p: '启动', t: '确认身体条件，为「{goal}」设死线', tip: '有基础疾病先问医生', m: 20 },
          { p: '布局', t: '清空高热量库存，备好一周食材', tip: '环境决定 70% 的执行率', m: 40 },
          { p: '执行', t: '完成 60 分钟训练（有氧 40 + 核心 20）', tip: '补水与热身不能省', m: 60 },
          { p: '执行', t: '按计划执行 1500kcal 饮食并逐餐记录', tip: '称重食材，别靠目测', m: 30 },
          { p: '执行', t: '双练日：早空腹有氧 + 晚间力量', tip: '两次之间留出 8 小时恢复', m: 90 },
          { p: '调整', t: '监测睡眠与静息心率，超限立刻减量', tip: '心率异常升高是过劳信号', m: 25 },
          { p: '复盘', t: '一周称重，掉秤过快就回调强度', tip: '每周超过体重 1% 的降幅不可持续', m: 30 }
        ]
      },
      {
        tag: '巧劲',
        name: '换个系统',
        emoji: '🪄',
        way: '不靠意志力，靠环境改造与微习惯绑定',
        base: 60,
        cost: '每天 15 分钟 + 一次环境改造',
        risk: '掉秤曲线平缓，需要看长期',
        plan: [
          { p: '启动', t: '写下过去几次没做成「{goal}」的真实原因', tip: '是时间、情绪还是社交场合', m: 20 },
          { p: '布局', t: '把运动绑定到既有习惯（通勤/午休/追剧）', tip: '绑定越具体，执行越自动', m: 15 },
          { p: '执行', t: '今天只做 15 分钟，但 100% 完成', tip: '先让「每天都做」变成身份，再加量', m: 15 },
          { p: '执行', t: '改造环境：走楼梯、站姿办公、换小盘子', tip: 'NEAT 非运动消耗能占到 15%', m: 20 },
          { p: '执行', t: '拉一个同伴或社群开始打卡', tip: '有人看见，完成率明显更高', m: 20 },
          { p: '调整', t: '给自己一次非食物奖励（连续 5 天）', tip: '别用吃来奖励不吃', m: 15 },
          { p: '复盘', t: '这一周用「完成率」而非体重打分', tip: '完成率 >80%，结果迟早会来', m: 20 }
        ]
      }
    ]
  },
  {
    key: 'study',
    name: '学习考试',
    color: '#5B6CFF',
    match: ['考研', '考公', '雅思', '托福', '英语', '单词', '背书', '背了', '考试', '上岸', '学习', '学了', '证书', '课程', '读书', '读了', '看了', '复习', '刷题', '四级', '六级', '绩点', '论文', '笔记', '听课'],
    routes: [
      {
        tag: '稳健',
        name: '系统推进',
        emoji: '🧭',
        way: '按章节推进 + 错题回收，每天 2 小时',
        base: 68,
        cost: '每天约 2 小时',
        risk: '进度感弱，容易在中期焦虑',
        plan: [
          { p: '启动', t: '为「{goal}」做一次摸底测试', tip: '不知道起点，计划就是空中楼阁', m: 60 },
          { p: '拆解', t: '把考纲/书单拆成 7 天的具体章节', tip: '每天一个可验收的小节', m: 30 },
          { p: '布局', t: '固定学习时段 + 手机放另一个房间', tip: '环境隔离比自控力便宜', m: 15 },
          { p: '执行', t: '完成第 1–2 章并做配套练习', tip: '看懂 ≠ 会做，一定要动笔', m: 120 },
          { p: '执行', t: '整理第一份错题本，标注错因', tip: '错因分类比抄题有用十倍', m: 60 },
          { p: '调整', t: '回炉重做前两天错题', tip: '间隔重复是最省力的记忆法', m: 90 },
          { p: '复盘', t: '周测一次，按正确率重排下周重点', tip: '把时间压到正确率最低的模块', m: 90 }
        ]
      },
      {
        tag: '激进',
        name: '高压集训',
        emoji: '🔥',
        way: '每天 5–6 小时，真题驱动，只练高频考点',
        base: 50,
        cost: '每天 5 小时以上',
        risk: '容易在第 4 天崩盘，需要提前清空日程',
        plan: [
          { p: '启动', t: '用一套真题给「{goal}」定位分数', tip: '先看真实差距，再定强度', m: 90 },
          { p: '布局', t: '清空这一周的所有非必要安排', tip: '提前跟家人朋友打招呼', m: 20 },
          { p: '执行', t: '刷完两套真题并逐题归因', tip: '做十套不如吃透两套', m: 180 },
          { p: '执行', t: '只攻高频考点，跳过低频内容', tip: '20% 的考点决定 80% 的分', m: 240 },
          { p: '执行', t: '整理一份「必背清单」反复过', tip: '短时高频胜过一次长时', m: 150 },
          { p: '调整', t: '强制睡眠 7 小时 + 上午复盘', tip: '睡眠不足会让记忆 consolidation 归零', m: 60 },
          { p: '复盘', t: '二次模考，评估是否维持高强度', tip: '分数涨不动就换策略', m: 120 }
        ]
      },
      {
        tag: '巧劲',
        name: '输出倒逼',
        emoji: '🪄',
        way: '费曼学习法：讲出来、教别人、做卡片',
        base: 61,
        cost: '每天约 1 小时',
        risk: '覆盖面依赖自律，容易漏掉冷门考点',
        plan: [
          { p: '启动', t: '挑一个刚学的知识点，用自己的话讲一遍', tip: '讲不下去的地方就是没懂的地方', m: 30 },
          { p: '布局', t: '建一份问答卡片（正面问题/背面答案）', tip: '主动回忆比反复阅读有效得多', m: 30 },
          { p: '执行', t: '每天过 30 张卡片，错的回到原文', tip: '错卡第二天自动出现', m: 45 },
          { p: '执行', t: '把本期内容讲给一个真人听 10 分钟', tip: '对方听不懂 = 你还没学会', m: 30 },
          { p: '执行', t: '做一份「一页纸总结」', tip: '压缩到一页，说明结构已成型', m: 60 },
          { p: '调整', t: '用总结去刷一套题，验证盲区', tip: '输出与输入必须闭环', m: 90 },
          { p: '复盘', t: '统计能独立讲清的知识点占比', tip: '这个比例就是真实掌握率', m: 40 }
        ]
      }
    ]
  },
  {
    key: 'career',
    name: '职业发展',
    color: '#7C5CFF',
    match: ['跳槽', '面试', '简历', '投递', '内推', '升职', '加薪', 'offer', '转行', '实习', '晋升', '绩效', '副业', '找工作', '求职', '大厂', '转正', '汇报', '晋升答辩'],
    routes: [
      {
        tag: '稳健',
        name: '稳扎稳打',
        emoji: '🧭',
        way: '简历精修 + 定向投递 + 每日复盘',
        base: 64,
        cost: '每天约 1 小时',
        risk: '反馈周期长，容易在第 3 天失去动力',
        plan: [
          { p: '启动', t: '为「{goal}」列出 3 个目标公司/岗位', tip: '先定靶子，再打磨子弹', m: 30 },
          { p: '拆解', t: '重写简历：每条经历都带数字结果', tip: '动词 + 动作 + 量化结果', m: 90 },
          { p: '布局', t: '整理作品集/项目清单，做成一页链接', tip: '可展示的证据最有说服力', m: 60 },
          { p: '执行', t: '定向投递 5 家并附上针对性说明', tip: '5 家定制 > 50 家海投', m: 60 },
          { p: '执行', t: '找一位业内人做 15 分钟信息访谈', tip: '内推转化率远高于冷投', m: 30 },
          { p: '调整', t: '整理常见面试问题，写下答题骨架', tip: 'STAR 结构：情境-任务-行动-结果', m: 60 },
          { p: '复盘', t: '统计投递/回应/面试转化率，调整方向', tip: '回应率低于 10% 说明简历或方向有问题', m: 40 }
        ]
      },
      {
        tag: '激进',
        name: '全面突击',
        emoji: '🔥',
        way: '一周内密集投递 + 高强度模拟面试',
        base: 49,
        cost: '每天 3 小时以上',
        risk: '准备不足就上场，容易消耗掉好机会',
        plan: [
          { p: '启动', t: '锁定「{goal}」的截止时间与底线条件', tip: '写清薪资底线与不能接受的项', m: 30 },
          { p: '布局', t: '一天内完成简历与作品集初版', tip: '先出初版，再迭代', m: 120 },
          { p: '执行', t: '批量投递 20 家，覆盖大中小厂', tip: '用数量换反馈速度', m: 120 },
          { p: '执行', t: '做 2 场模拟面试并录音回听', tip: '回听比自我感觉准得多', m: 120 },
          { p: '执行', t: '针对高频技术题做专项突破', tip: '每天一类，做透为止', m: 180 },
          { p: '调整', t: '主动跟进未回应的投递', tip: '跟进一次能把回应率翻倍', m: 45 },
          { p: '复盘', t: '按反馈重排优先级，砍掉无效渠道', tip: '数据会告诉你哪里该停', m: 60 }
        ]
      },
      {
        tag: '巧劲',
        name: '杠杆借力',
        emoji: '🪄',
        way: '先做人脉与影响力，让机会主动找上门',
        base: 57,
        cost: '每天约 40 分钟',
        risk: '见效慢，前 7 天可能拿不到任何面试',
        plan: [
          { p: '启动', t: '列出 10 个可能帮到「{goal}」的人', tip: '二度人脉也算，先列再筛', m: 25 },
          { p: '布局', t: '发出 3 条有具体问题的请教消息', tip: '具体问题比「求内推」回复率高', m: 30 },
          { p: '执行', t: '公开输出一条专业内容（文章/回答）', tip: '可见度会带来意外的机会', m: 60 },
          { p: '执行', t: '加入一个行业社群并发一次有价值的发言', tip: '先给价值，再要资源', m: 30 },
          { p: '执行', t: '约一次 20 分钟的线上咖啡聊', tip: '目标是了解，不是当场要offer', m: 30 },
          { p: '调整', t: '复盘人脉反馈，修正目标岗位画像', tip: '别人眼中的你，就是市场定位', m: 30 },
          { p: '复盘', t: '维护一份「关系台账」，写下下一步动作', tip: '关系需要节奏，不能一次性的', m: 25 }
        ]
      }
    ]
  },
  {
    key: 'money',
    name: '财富积累',
    color: '#12B886',
    match: ['存钱', '存了', '存下', '攒钱', '攒了', '理财', '投资', '基金', '股票', '定投', '还债', '房贷', '买房', '存款', '预算', '记账', '支出', '消费', '工资', '收入', '财务自由', '万'],
    routes: [
      {
        tag: '稳健',
        name: '节流定投',
        emoji: '🧭',
        way: '先记账砍漏，再把结余自动定投',
        base: 70,
        cost: '每天约 20 分钟',
        risk: '短期看不出变化，需要熬过前两个月',
        plan: [
          { p: '启动', t: '为「{goal}」算清现金流：收入-固定支出', tip: '可自由支配的才是真预算', m: 30 },
          { p: '拆解', t: '导出近 30 天账单，找出前 3 大漏点', tip: '通常是一两个订阅/外卖/冲动消费', m: 40 },
          { p: '布局', t: '设置工资日自动转账到储蓄账户', tip: '自动化的存钱才存得下来', m: 20 },
          { p: '执行', t: '取消 1 个不常用的订阅/会员', tip: '先做最容易的一刀', m: 15 },
          { p: '执行', t: '建立 3 个账户：日常/目标/长期', tip: '账户分离能显著降低挪用率', m: 30 },
          { p: '调整', t: '设定本周消费上限并写入手机提醒', tip: '周额度比月额度更容易守住', m: 20 },
          { p: '复盘', t: '对账：本周实际 vs 预算，找一处优化', tip: '每周优化 1%，一年差很多', m: 30 }
        ]
      },
      {
        tag: '激进',
        name: '开源加速',
        emoji: '🔥',
        way: '同时做副业增收 + 高强度节流',
        base: 44,
        cost: '每天 3 小时以上',
        risk: '收入不确定，容易两头都没做好',
        plan: [
          { p: '启动', t: '列出 3 个能在 7 天内变现的技能', tip: '能立刻收钱的才算，不是「学完之后」', m: 40 },
          { p: '布局', t: '搭好接单渠道：平台/朋友圈/社群', tip: '渠道比能力更早决定收入', m: 60 },
          { p: '执行', t: '完成第一单交付，哪怕价格很低', tip: '第一单的目标是验证流程', m: 180 },
          { p: '执行', t: '把本周开支压到预算的 70%', tip: '特殊时期，允许极端一点', m: 30 },
          { p: '执行', t: '复购/转介绍：向第一个客户要反馈和推荐', tip: '老客户转化成本最低', m: 45 },
          { p: '调整', t: '计算时薪，砍掉低于时薪的事', tip: '低价值忙碌是最贵的浪费', m: 30 },
          { p: '复盘', t: '算清这周的净增收，判断可持续性', tip: '不可持续的高强度不如稳态', m: 40 }
        ]
      },
      {
        tag: '巧劲',
        name: '结构改造',
        emoji: '🪄',
        way: '不动收入，先改掉造成漏财的结构性问题',
        base: 62,
        cost: '每天约 25 分钟',
        risk: '需要面对一些不舒服的账目',
        plan: [
          { p: '启动', t: '给「{goal}」做一次负债与利率盘点', tip: '先还利率最高的那一笔', m: 30 },
          { p: '拆解', t: '找出 3 笔「惯性支出」（习惯性付费）', tip: '惯性支出是隐形的长期税', m: 30 },
          { p: '布局', t: '把固定账单改为年付或重新议价', tip: '打一个客服电话常常能省 10–20%', m: 30 },
          { p: '执行', t: '设置 24 小时冷静期规则（大额消费）', tip: '隔夜之后一半的冲动会消失', m: 15 },
          { p: '执行', t: '建立应急金账户，先攒 1 个月开销', tip: '应急金是所有理财的地基', m: 20 },
          { p: '调整', t: '把目标金额拆成每周定额并可视化', tip: '看得见的进度条最能坚持', m: 20 },
          { p: '复盘', t: '对比改造前后的月度固定支出', tip: '一次性改造的收益是长期的', m: 25 }
        ]
      }
    ]
  },
  {
    key: 'create',
    name: '创作输出',
    color: '#F59F00',
    match: ['写作', '写书', '写了', '公众号', '小红书', '视频', '博主', '画画', '剪辑', '播客', '摄影', '日更', '更新', '发布', '发了', '作品', '文章', '小说', '设计', '选题', '涨粉'],
    routes: [
      {
        tag: '稳健',
        name: '日更积累',
        emoji: '🧭',
        way: '每天固定产出一条，先堆量再谈质',
        base: 65,
        cost: '每天约 1 小时',
        risk: '数据增长慢，容易在第 5 天怀疑自己',
        plan: [
          { p: '启动', t: '为「{goal}」定下最小产出单位', tip: '比如 300 字 / 15 秒 / 1 张图', m: 20 },
          { p: '拆解', t: '攒 10 个选题放进素材库', tip: '选题库空了，日更必断', m: 30 },
          { p: '布局', t: '固定发布时段，设好日历提醒', tip: '稳定的节奏本身就是算法友好的', m: 15 },
          { p: '执行', t: '完成并发布第 1 条', tip: '发出去比做好更重要', m: 60 },
          { p: '执行', t: '完成并发布第 2–3 条', tip: '连续三天，习惯开始成型', m: 60 },
          { p: '调整', t: '看数据：哪条的完播/阅读最好，复制它', tip: '让数据告诉你方向', m: 30 },
          { p: '复盘', t: '周度复盘：发布数、最佳一条、下周选题', tip: '这周的目标是「没断更」', m: 30 }
        ]
      },
      {
        tag: '激进',
        name: '集中爆发',
        emoji: '🔥',
        way: '一周内憋出一条高质量代表作',
        base: 46,
        cost: '每天 3 小时以上',
        risk: '打磨过头容易烂尾，一定要设死线',
        plan: [
          { p: '启动', t: '为「{goal}」定一个必须发布的时间', tip: '死线是创作的第一生产力', m: 20 },
          { p: '布局', t: '一次列完大纲与素材清单', tip: '先把骨架定死，再填肉', m: 90 },
          { p: '执行', t: '完成初稿/初剪，不回头修改', tip: '一气呵成，编辑留到明天', m: 180 },
          { p: '执行', t: '打磨开头 3 秒 / 前 100 字', tip: '决定生死的就是开头', m: 90 },
          { p: '执行', t: '找 2 个人看，只问「哪里想划走」', tip: '负面反馈比赞美有用', m: 45 },
          { p: '调整', t: '按反馈改一版，然后停止修改', tip: '完美主义是发布的敌人', m: 120 },
          { p: '复盘', t: '发布并复盘：这条的经验能否复制', tip: '能复制的才叫方法论', m: 40 }
        ]
      },
      {
        tag: '巧劲',
        name: '形式创新',
        emoji: '🪄',
        way: '换载体、蹭结构、借势已有流量',
        base: 59,
        cost: '每天约 45 分钟',
        risk: '形式对了但内容薄弱，仍会失败',
        plan: [
          { p: '启动', t: '研究 3 个同类里做得最好的账号', tip: '拆解它们的结构，不是内容', m: 45 },
          { p: '拆解', t: '总结出一个可复用的内容模板', tip: '模板 = 钩子 + 结构 + 收尾', m: 30 },
          { p: '布局', t: '用模板套一个自己的选题试试', tip: '先验证模板，再打磨表达', m: 40 },
          { p: '执行', t: '把已有内容改成另一种形式再发一次', tip: '一鱼多吃，成本最低', m: 60 },
          { p: '执行', t: '在别人的热门话题下做一次有价值的补充', tip: '借势不等于抄袭，要有增量', m: 40 },
          { p: '调整', t: '建立一个可长期用的系列名', tip: '系列化能沉淀固定受众', m: 25 },
          { p: '复盘', t: '对比不同形式的数据，选定主打', tip: '选定后至少坚持 30 天', m: 30 }
        ]
      }
    ]
  },
  {
    key: 'social',
    name: '关系社交',
    color: '#E64980',
    match: ['脱单', '恋爱', '相亲', '社交', '交朋友', '沟通', '表白', '约会', '人脉', '认识', '内向', '孤独', '伴侣', '聚会', '聊天'],
    routes: [
      {
        tag: '稳健',
        name: '自然扩展',
        emoji: '🧭',
        way: '每周固定进入 2 个新场景，慢慢积累',
        base: 60,
        cost: '每周约 4 小时',
        risk: '见效慢，需要 4 周以上',
        plan: [
          { p: '启动', t: '写下「{goal}」的具体画像与底线', tip: '具体才有筛选力', m: 25 },
          { p: '拆解', t: '列出 5 个能自然认识人的场景', tip: '兴趣类 > 目的性场所', m: 25 },
          { p: '布局', t: '本周报名 1 个线下活动', tip: '付费活动的人质量通常更高', m: 20 },
          { p: '执行', t: '参加活动，至少主动聊 3 个人', tip: '目标是聊天，不是当场成交', m: 120 },
          { p: '执行', t: '给聊得来的人发一条后续消息', tip: '24 小时内跟进最自然', m: 20 },
          { p: '调整', t: '复盘：哪些话题让对话变长', tip: '记住有效的开场方式', m: 25 },
          { p: '复盘', t: '整理本周新增联系人与下一步', tip: '关系需要节奏地维护', m: 20 }
        ]
      },
      {
        tag: '激进',
        name: '高频出击',
        emoji: '🔥',
        way: '高强度社交，一周密集接触大量新人',
        base: 43,
        cost: '每周 10 小时以上',
        risk: '容易疲劳和空心化，质量不稳定',
        plan: [
          { p: '启动', t: '为「{goal}」设定本周接触人数目标', tip: '数字要具体，比如 20 人', m: 20 },
          { p: '布局', t: '排满一周的社交日程', tip: '把可选变成必选', m: 40 },
          { p: '执行', t: '一天参加 2 场活动，主动破冰', tip: '破冰只需要一句具体的赞美', m: 180 },
          { p: '执行', t: '为每一次对话记一条备忘', tip: '细节是后续关系的钥匙', m: 30 },
          { p: '执行', t: '主动约 2 个聊得来的人单独见面', tip: '从群体到个体才是关键一步', m: 150 },
          { p: '调整', t: '留出独处时间，避免社交透支', tip: '透支会让你在关键时刻表现变形', m: 60 },
          { p: '复盘', t: '统计接触/回应/深聊的转化率', tip: '数据会指出该换场景了', m: 40 }
        ]
      },
      {
        tag: '巧劲',
        name: '场景重构',
        emoji: '🪄',
        way: '改造生活方式，让相遇变成副产品',
        base: 58,
        cost: '每天约 30 分钟',
        risk: '不确定性高，关键在坚持',
        plan: [
          { p: '启动', t: '问自己：我想成为什么样的人', tip: '吸引比追逐省力得多', m: 25 },
          { p: '拆解', t: '选一个能长期坚持的兴趣活动', tip: '长期活动里才有重复的熟悉感', m: 25 },
          { p: '布局', t: '固定时间去固定的地方', tip: '重复性曝光是关系的基础', m: 20 },
          { p: '执行', t: '第一次参加，只观察不表现', tip: '先摸清这个圈子的语言', m: 60 },
          { p: '执行', t: '第二次主动提供一次帮助/分享', tip: '给价值是最快的融入方式', m: 45 },
          { p: '调整', t: '把线上形象整理一遍（头像/简介）', tip: '第一印象往往发生在线上', m: 30 },
          { p: '复盘', t: '记录这周新出现的人和自然对话', tip: '自然发生的关系更稳', m: 20 }
        ]
      }
    ]
  }
]

/* ------------------------------ 需求解析 ------------------------------ */

const PREFIX = /^(我(想|要|打算|希望|准备|计划|决定)|麻烦|请|帮我|让我|目标(是)?|在|想(要)?)/

function cleanGoal(raw) {
  let s = String(raw || '').trim().replace(/[\s，,。.!！?？]+$/g, '')
  s = s.replace(PREFIX, '').replace(/^(在|于)/, '')
  return s || String(raw || '').trim()
}

function detectCategory(text) {
  let best = GENERIC
  let hits = 0
  CATEGORIES.forEach(function (c) {
    let n = 0
    c.match.forEach(function (w) {
      if (text.indexOf(w) >= 0) n++
    })
    if (n > hits) {
      hits = n
      best = c
    }
  })
  return { category: best, hits: hits }
}

const CN_NUM = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }

/** 支持阿拉伯数字与中文数字：3 / 三 / 十二 / 两 */
function toNumber(s) {
  if (/^\d+$/.test(s)) return parseInt(s, 10)
  if (s.indexOf('百') >= 0) {
    const p = s.split('百')
    return (p[0] ? toNumber(p[0]) : 1) * 100 + (p[1] ? toNumber(p[1]) : 0)
  }
  if (s.indexOf('十') >= 0) {
    const parts = s.split('十')
    const a = parts[0] ? CN_NUM[parts[0]] || 0 : 1
    const b = parts[1] ? CN_NUM[parts[1]] || 0 : 0
    return a * 10 + b
  }
  return CN_NUM[s] || 0
}

function parseHorizon(text) {
  // 年底 / 年末：按当年剩余天数算
  if (/年底|年末|过年|春节前/.test(text)) {
    const now = new Date()
    const end = new Date(now.getFullYear(), 11, 31)
    const days = Math.max(1, Math.round((end.getTime() - now.getTime()) / 86400000))
    return { days: days, label: '年底（约 ' + days + ' 天）' }
  }
  if (/半年/.test(text)) return { days: 180, label: '半年' }

  // "坚持第 3 天" 这类打卡语境不算时限
  const t2 = String(text).replace(/第\s*\d+\s*天/g, '')
  const m = t2.match(/(\d+|[一二三四五六七八九十两百]+)\s*(天|周|个?月|年)/)
  if (!m) return { days: 0, label: '未设时限' }
  const n = toNumber(m[1])
  if (!n) return { days: 0, label: '未设时限' }

  let days = n
  let label = n + '天'
  if (m[2].indexOf('周') >= 0) {
    days = n * 7
    label = n + '周'
  } else if (m[2].indexOf('月') >= 0) {
    days = n * 30
    label = n + '个月'
  } else if (m[2].indexOf('年') >= 0) {
    days = n * 365
    label = n + '年'
  }
  return { days: days, label: label }
}

function parseQuantity(text) {
  const m = text.match(/(\d+(?:\.\d+)?)\s*(斤|公斤|kg|KG|万|元|块|本|个|次|分|公里|km|KM|页|篇|条|小时|分钟|组|步|杯|家|人|天)/)
  if (!m) return null
  return { value: parseFloat(m[1]), unit: m[2] }
}

function hash(str) {
  let h = 2166136261
  const s = String(str)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h >>> 0
}

function parseNeed(raw) {
  const text = String(raw || '').trim()
  const detected = detectCategory(text)
  const horizon = parseHorizon(text)
  const qty = parseQuantity(text)
  return {
    raw: text,
    goal: cleanGoal(text),
    category: detected.category,
    matched: detected.hits > 0,
    horizon: horizon,
    quantity: qty,
    vague: text.length < 6
  }
}

/* ------------------------ 当下这句话：意图分析 ------------------------ */

// 每个领域可即时执行的建议动作池（{goal} 会被替换成目标标题）
const ACTION_POOL = {
  fitness: [
    { t: '今天做 20 分钟，先把链条续上', tip: '连续三天比一次猛练更值钱', m: 20 },
    { t: '记录一次体重或围度', tip: '数据能挡住「好像没变化」的错觉', m: 5 },
    { t: '把训练时间写进明天的日历', tip: '具体到几点，执行率翻倍', m: 5 },
    { t: '今晚提前把运动装备准备好', tip: '减少第二天的启动摩擦', m: 5 },
    { t: '找一个同伴互相打卡', tip: '外部约束比自我监督有效', m: 10 }
  ],
  study: [
    { t: '今天只学 25 分钟，用番茄钟', tip: '短时高频胜过一次长时低效', m: 25 },
    { t: '把昨天学的内容讲一遍', tip: '讲不下去的地方就是盲点', m: 15 },
    { t: '整理 3 道错题并标注错因', tip: '错因分类比抄题有用十倍', m: 20 },
    { t: '学习时把手机放到另一个房间', tip: '环境隔离比自控力便宜', m: 2 },
    { t: '列出接下来 7 天的章节表', tip: '看得见的进度最能坚持', m: 15 }
  ],
  career: [
    { t: '今天改一条简历，带上数字结果', tip: '动词 + 动作 + 量化结果', m: 20 },
    { t: '定向投递 3 家并写针对性说明', tip: '3 家定制胜过 30 家海投', m: 30 },
    { t: '向一位业内人发一条具体问题', tip: '具体问题的回复率高得多', m: 10 },
    { t: '写下 3 个面试问题的答题骨架', tip: 'STAR：情境-任务-行动-结果', m: 30 },
    { t: '整理一份一页纸作品集', tip: '可展示的证据最有说服力', m: 40 }
  ],
  money: [
    { t: '导出本周账单，找出最大的一笔漏财', tip: '通常就是一两个惯性支出', m: 15 },
    { t: '设置工资日自动转账储蓄', tip: '自动化的存钱才存得下来', m: 10 },
    { t: '取消一个不常用的订阅', tip: '先做最容易的一刀', m: 5 },
    { t: '给大额消费设 24 小时冷静期', tip: '隔夜之后一半的冲动会消失', m: 5 },
    { t: '把目标拆成每周定额并可视化', tip: '看得见的进度条才守得住', m: 10 }
  ],
  create: [
    { t: '今天产出最小一条并发布', tip: '发出去比做好更重要', m: 40 },
    { t: '攒 5 个选题进素材库', tip: '选题库空了，更新必断', m: 20 },
    { t: '拆解一个对标作品的结构', tip: '拆结构，不拆内容', m: 25 },
    { t: '打磨开头 3 秒 / 前 100 字', tip: '决定生死的就是开头', m: 20 },
    { t: '把旧内容换个形式再发一次', tip: '一鱼多吃，成本最低', m: 30 }
  ],
  social: [
    { t: '今天主动和一个新的人说一句话', tip: '破冰只需要一句具体的赞美', m: 10 },
    { t: '本周报名一个线下活动', tip: '付费活动里的人往往更稳定', m: 10 },
    { t: '给聊得来的人发一条后续消息', tip: '24 小时内跟进最自然', m: 5 },
    { t: '整理一遍线上形象与简介', tip: '第一印象常常发生在线上', m: 15 },
    { t: '复盘一次对话里最有效的话题', tip: '记住有效的开场方式', m: 10 }
  ],
  generic: [
    { t: '把下一步拆到 30 分钟内能做完', tip: '还是太大就继续拆', m: 15 },
    { t: '给这一步排一个具体时间', tip: '写进日历才算数', m: 5 },
    { t: '先做出 60 分版本', tip: '完美主义是启动的敌人', m: 30 },
    { t: '找一个已经做到的人问一条经验', tip: '一条经验胜过十篇攻略', m: 15 },
    { t: '写下卡住的那个具体环节', tip: '卡住往往是方法问题，不是意志力问题', m: 10 }
  ]
}

// 用户只是在汇报/抱怨、但还没有明确目标时，用领域默认名兜底
const DEFAULT_TITLE = {
  fitness: '把运动和体重管起来',
  study: '把学习进度推下去',
  career: '推进职业发展',
  money: '把钱存下来',
  create: '保持稳定输出',
  social: '拓展关系与社交',
  generic: '推进手上的目标'
}

const CRITERION = {
  fitness: '用数字验收：体重、围度或连续运动天数',
  study: '用正确率或完成的章节/题量验收',
  career: '用投递数、面试数、offer 验收',
  money: '用存款余额或月度结余验收',
  create: '用发布条数或完读率验收',
  social: '用新增联系人数或见面次数验收',
  generic: '写清数字与截止日，能一眼判断是否达成'
}

const INTENT_RULES = [
  { key: 'setback', label: '遇到阻力', re: /没(做到|坚持|跑|做|学|看|去|忍住)|失败|放弃|坚持不下去|太难|好累|崩溃|拖延|又没|管不住|忍不住|摆烂|焦虑|想放弃/ },
  { key: 'ask', label: '想问办法', re: /怎么|如何|怎么办|该不该|要不要|建议|方法|求支招|吗[？?]|[？?]/ },
  { key: 'progress', label: '汇报进展', re: /今天|刚刚|刚才|昨天|已经|完成|做完|跑了|读了|写了|练了|打卡|坚持|搞定|达成|减了|瘦了|存了|投了|第\s*\d+\s*天/ }
]

function detectIntent(text) {
  for (let i = 0; i < INTENT_RULES.length; i++) {
    if (INTENT_RULES[i].re.test(text)) {
      return { key: INTENT_RULES[i].key, label: INTENT_RULES[i].label }
    }
  }
  return { key: 'new', label: '冒出新目标' }
}

function buildSummary(intent, category, quote, qty, goal) {
  const cat = category.name
  if (intent === 'setback') {
    return '这句话里有挫败感。' + cat + '卡住，九成不是意志力问题，而是上一个动作定得太大 —— 把它砍到今天就能完成的尺寸，先恢复手感。'
  }
  if (intent === 'ask') {
    return '你在问办法。别急着找方法，先确认卡在哪一类：时间没排进去、方法不匹配、还是心理阻力。' + cat + '里最常见的是第一种。'
  }
  if (intent === 'progress') {
    return '记下了：你在往前走。' + cat + '这类事最怕断档，连续性比强度更值钱 —— 今天这一笔已经算数了。'
  }
  return '你要的是「' + goal + '」。先别定大计划：把它拆成今天就能做完的最小一步，' + cat + '的成败通常在第一周就决定了。'
}

/**
 * 分析用户当下的一句话
 * @param {string} text 用户刚说的话
 * @param {object} goal 已归拢到的目标（可为空）
 */
function analyze(text, goal) {
  const t = String(text || '').trim()
  const intent = detectIntent(t)
  const category = detectCategory(t).category
  const qty = parseQuantity(t)
  const cleaned = cleanGoal(t)
  const title = goal ? goal.title : cleaned
  // 只在「冒出新目标」时才用原句当目标名，其余情况用领域默认名兜底
  const suggested = goal ? goal.title : intent.key === 'new' ? cleaned : DEFAULT_TITLE[category.key] || DEFAULT_TITLE.generic
  const quote = t.length > 22 ? t.slice(0, 22) + '…' : t

  const pool = ACTION_POOL[category.key] || ACTION_POOL.generic
  const seed = hash(t) % pool.length
  const suggestions = [pool[seed], pool[(seed + 2) % pool.length]].map(function (a) {
    return { title: a.t.replace(/\{goal\}/g, suggested), tip: a.tip, minutes: a.m }
  })

  return {
    text: t,
    intent: intent.key,
    intentLabel: intent.label,
    category: category,
    quantity: qty,
    // 只有明确立新目标时，数值才算「目标量」；其余都是「已完成量」
    metricKind: intent.key === 'new' ? 'target' : 'done',
    goalTitle: title,
    suggestedTitle: suggested,
    quote: quote,
    summary: buildSummary(intent.key, category, quote, qty, title),
    suggestions: suggestions,
    criterion: CRITERION[category.key] || CRITERION.generic
  }
}

/* --------------------------- 概率 & 方案生成 --------------------------- */

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

function adjust(base, need, idx, seed) {
  let p = base
  const h = need.horizon.days || 90

  if (h <= 14) {
    p += idx === 1 ? 10 : idx === 0 ? -13 : -4
  } else if (h <= 45) {
    p += idx === 1 ? 6 : idx === 0 ? 1 : 3
  } else if (h <= 180) {
    p += idx === 0 ? 8 : idx === 1 ? -5 : 4
  } else {
    p += idx === 0 ? 4 : idx === 1 ? -11 : 9
  }

  if (need.quantity) {
    p -= 4
    if (idx === 1) p -= 4
  }
  if (need.raw.length > 30) p -= 3
  if (need.vague) p -= 3

  // 稳定抖动：同一需求 + 同一 seed 结果一致
  const jitter = (hash(need.raw + '#' + seed + '#' + idx) % 7) - 3
  p += jitter

  return Math.round(clamp(p, 15, 92))
}

/**
 * 生成三条未来选择，按达成概率从高到低排序
 */
function buildOptions(need, seed) {
  const routes = need.category.routes
  const list = routes.map(function (r, i) {
    const prob = adjust(r.base, need, i, seed || 0)
    return {
      id: need.category.key + '-' + i,
      tag: r.tag,
      name: r.name,
      emoji: r.emoji,
      way: r.way,
      probability: prob,
      cost: r.cost,
      risk: r.risk,
      plan: r.plan,
      categoryKey: need.category.key
    }
  })

  list.sort(function (a, b) {
    return b.probability - a.probability
  })

  // 拉开差距，避免三条概率挤在一起
  for (let i = 1; i < list.length; i++) {
    if (list[i - 1].probability - list[i].probability < 4) {
      list[i].probability = clamp(list[i - 1].probability - 4, 15, 92)
    }
  }
  return list
}

/* ------------------------------ 行动时间线 ------------------------------ */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/**
 * 把选中的方案展开成七天的行动时间线
 */
function buildRecord(need, option, startDate) {
  const start = startDate || date.today()
  const goal = need.goal
  const tasks = option.plan.map(function (item, i) {
    const d = date.addDays(start, i)
    return {
      id: uid(),
      index: i,
      date: d,
      phase: item.p,
      title: item.t.replace(/\{goal\}/g, goal),
      tip: item.tip,
      minutes: item.m,
      done: false,
      doneAt: 0
    }
  })

  return {
    id: uid(),
    need: need.raw,
    goal: goal,
    categoryKey: need.category.key,
    categoryName: need.category.name,
    categoryColor: need.category.color,
    option: {
      id: option.id,
      tag: option.tag,
      name: option.name,
      emoji: option.emoji,
      way: option.way,
      probability: option.probability,
      cost: option.cost,
      risk: option.risk
    },
    horizonLabel: need.horizon.label,
    createdAt: Date.now(),
    start: start,
    end: date.addDays(start, 6),
    tasks: tasks
  }
}

function progressOf(record) {
  const total = record.tasks.length
  let done = 0
  let minutes = 0
  record.tasks.forEach(function (t) {
    if (t.done) {
      done++
      minutes += t.minutes
    }
  })
  return { done: done, total: total, percent: total ? Math.round((done / total) * 100) : 0, minutes: minutes }
}

function findCategory(key) {
  for (let i = 0; i < CATEGORIES.length; i++) {
    if (CATEGORIES[i].key === key) return CATEGORIES[i]
  }
  return GENERIC
}

module.exports = {
  CATEGORIES: CATEGORIES,
  GENERIC: GENERIC,
  ACTION_POOL: ACTION_POOL,
  findCategory: findCategory,
  analyze: analyze,
  parseNeed: parseNeed,
  buildOptions: buildOptions,
  buildRecord: buildRecord,
  progressOf: progressOf,
  uid: uid
}
