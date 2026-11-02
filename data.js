/* =========================================================================
   data.js —— 数据与配置层
   ---------------------------------------------------------------------------
   这里只有「数据」和「常量」，没有任何 DOM / Vue 代码：
     · I18N / CANTEEN_EN / ORDER_EN  多语言字典
     · seedShops                     19 家餐厅基础数据（按食堂分组）
     · KEY_LIB / STATUS_MAP          忌口关键词库、身体状态 → 忌口类型映射
     · ORDER_TAG / ORDER_OPTIONS     点餐方式的标签样式与可选项
   加一家餐厅：往 seedShops 里加一个对象即可，不用改其它文件。
   ========================================================================= */

/* =========================================================================
   一、多语言字典（i18n 思路）
   ---------------------------------------------------------------------------
   知识点：所有界面文案集中在 I18N[语言] 里，模板只写 t('key')。
   加一门语言 = 复制一份字典翻译，不用改任何模板。
   菜名/店名/描述属于「数据」，保持中文原名（校园真实店名，翻译反而不便识别）。
   ========================================================================= */
const I18N = {
  zh: {
    'app.title': '今天吃什么？',
    'app.sub': '校园食堂智能推荐 · 白云学院',
    'lang.aria': '切换到英文',
    'theme.aria': '切换主题：万圣节 / 日常',
    'theme.tag': 'Halloween',
    'theme.onToast': '🎃 万圣节主题已开启',
    'theme.offToast': '已切回日常主题',
    'pet.aria': '南瓜灯小幽灵，点一下会说话',
    'pet.l1': '别吃泡面了…食堂还有热汤',
    'pet.l2': '今天想吃什么？我陪你选',
    'pet.l3': '记得喝水哦～',
    'pet.l4': '这家的自选称重挺划算',
    'nav.aria': '功能切换',
    'tab.recommend': '🎯 帮我选',
    'tab.list': '📋 餐厅清单',
    'step.status': '选状态',
    'step.canteen': '选食堂',
    'step.result': '出结果',
    'status.title': '今天身体状态？',
    'status.normal': '正常',
    'status.soreThroat': '喉咙痛',
    'status.cold': '感冒',
    'status.period': '经期',
    'status.stomachAche': '肚子疼',
    'status.stomachPain': '胃疼',
    'hint.normal': '身体状态良好，均衡饮食就好',
    'hint.soreThroat': '忌辣、油炸上火食物，多喝温水',
    'hint.cold': '优先热食，避开冰饮重油，好好休息',
    'hint.period': '不要冰饮生冷，优先温热食物',
    'hint.stomachAche': '尽量温和易消化，少吃刺激食物',
    'hint.stomachPain': '胃比较敏感，避开酸辣油炸，七分饱',
    'canteen.title': '想吃哪家食堂？',
    'canteen.all': '全选',
    'canteen.clear': '清空',
    'action.add': '＋ 添加餐厅',
    'action.pick': '🎲 帮我选一家',
    'action.picking': '挑选中…',
    'list.title': '全部餐厅（{n} 家）',
    'list.hint': '「删除」仅对你添加的餐厅生效；基础数据不可在界面删除。',
    'list.col.canteen': '食堂',
    'list.col.shop': '店名',
    'list.col.order': '订单方式',
    'list.col.action': '操作',
    'list.delete': '删除',
    'result.label': '为你推荐',
    'result.dish': '今日推荐：{d}',
    'result.swap': '换一家',
    'qr.btn': '查看二维码',
    'qr.orderBtn': '点餐方式',
    'qr.orderLabel': '订单方式：{o}',
    'qr.tip.pending': '（二维码图片待补充，可到店向店员询问）',
    'qr.tip.mini': '（在微信小程序内点餐）',
    'qr.tip.reserve': '（可提前预定，到店取餐）',
    'qr.tip.dinein': '（到店后现场点餐，无需二维码）',
    'add.title': '添加餐厅',
    'add.name': '店名 *',
    'add.namePh': '例如：湘小悦',
    'add.canteen': '食堂',
    'add.canteenPh': '例如：四季轩1楼',
    'add.order': '订单方式',
    'add.dishes': '菜品（逗号 / 顿号 / 空格分隔，可留空）',
    'add.dishesPh': '例如：辣椒炒肉、剁椒鱼头',
    'add.desc': '一句话描述（留空自动生成）',
    'add.descPh': '描述这家店的特点',
    'add.cancel': '取消',
    'add.save': '保存',
    'toast.noResult': '当前条件下没有合适的店，换个状态或食堂试试~',
    'toast.nameRequired': '请填写店名',
    'toast.added': '已添加：{name}',
    'toast.deleted': '已删除：{name}',
    'about.title': '关于',
    'about.intro': '帮你决定「今天吃什么」的校园食堂推荐工具。',
    'about.vue': 'Options API，数据/计算/方法分层',
    'about.js': '纯函数封装算法与中文分词切分',
    'about.routerKey': '路由',
    'about.router': 'currentView 切换视图（可升级 vue-router）',
    'about.axios': '适配层可替换为 get/post/put/delete 请求',
    'about.engKey': '工程化',
    'about.eng': '多文件模块 + 组件化拆分',
    'about.ui': '手写等价弹窗/表格/标签组件',
    'about.new': 'v2 新增：主题点击特效 · 中英切换 · 百分比切割 · 🎃 万圣节皮肤（右上角可一键切换，节后自动恢复）',
    'common.close': '关闭'
  },
  en: {
    'app.title': 'What to Eat Today?',
    'app.sub': 'Campus canteen picker · Baiyun College',
    'lang.aria': 'Switch to Chinese',
    'theme.aria': 'Toggle theme: Halloween / Daily',
    'theme.tag': 'Halloween',
    'theme.onToast': '🎃 Halloween theme on',
    'theme.offToast': 'Back to the daily theme',
    'pet.aria': 'Jack-o-lantern ghost — tap me and I will talk',
    'pet.l1': 'Skip the instant noodles… the canteen has hot soup.',
    'pet.l2': 'What are we eating today? I will help you pick.',
    'pet.l3': 'Remember to drink water.',
    'pet.l4': 'The pay-by-weight counter is a good deal.',
    'nav.aria': 'View switch',
    'tab.recommend': '🎯 Pick',
    'tab.list': '📋 Restaurants',
    'step.status': 'Status',
    'step.canteen': 'Canteen',
    'step.result': 'Result',
    'status.title': 'How do you feel today?',
    'status.normal': 'Fine',
    'status.soreThroat': 'Sore throat',
    'status.cold': 'Cold',
    'status.period': 'Period',
    'status.stomachAche': 'Stomach ache',
    'status.stomachPain': 'Gastric pain',
    'hint.normal': 'Feeling good — a balanced meal is enough',
    'hint.soreThroat': 'Skip spicy & fried food, drink warm water',
    'hint.cold': 'Go for warm food, avoid cold drinks & greasy dishes',
    'hint.period': 'No cold drinks — prefer warm food',
    'hint.stomachAche': 'Keep it mild and easy to digest',
    'hint.stomachPain': 'Sensitive stomach — avoid spicy/fried, eat 70% full',
    'canteen.title': 'Which canteen?',
    'canteen.all': 'Select all',
    'canteen.clear': 'Clear',
    'action.add': '＋ Add place',
    'action.pick': '🎲 Pick one for me',
    'action.picking': 'Picking…',
    'list.title': 'All places ({n})',
    'list.hint': 'Delete only works on places you added; built-in data is protected.',
    'list.col.canteen': 'Canteen',
    'list.col.shop': 'Name',
    'list.col.order': 'Order',
    'list.col.action': 'Action',
    'list.delete': 'Delete',
    'result.label': "Today's pick",
    'result.dish': "Today's dish: {d}",
    'result.swap': 'Another one',
    'qr.btn': 'View QR',
    'qr.orderBtn': 'Order method',
    'qr.orderLabel': 'Order: {o}',
    'qr.tip.pending': '(QR image coming soon — please ask the staff)',
    'qr.tip.mini': '(Order inside the WeChat mini program)',
    'qr.tip.reserve': '(Pre-order and pick up in store)',
    'qr.tip.dinein': '(Order at the counter — no QR needed)',
    'add.title': 'Add a place',
    'add.name': 'Name *',
    'add.namePh': 'e.g. Xiang Xiaoyue',
    'add.canteen': 'Canteen',
    'add.canteenPh': 'e.g. Sijixuan 1F',
    'add.order': 'Order method',
    'add.dishes': 'Dishes (comma / space separated, optional)',
    'add.dishesPh': 'e.g. Chili pork, Fish head',
    'add.desc': 'Short note (auto-filled if empty)',
    'add.descPh': 'What makes this place special',
    'add.cancel': 'Cancel',
    'add.save': 'Save',
    'toast.noResult': 'No match — try another status or canteen.',
    'toast.nameRequired': 'Please enter a name',
    'toast.added': 'Added: {name}',
    'toast.deleted': 'Deleted: {name}',
    'about.title': 'About',
    'about.intro': 'A campus canteen picker that decides where to eat today.',
    'about.vue': 'Options API with data / computed / methods',
    'about.js': 'Pure helper functions for filtering & splitting',
    'about.routerKey': 'Router',
    'about.router': 'View switching via currentView (vue-router ready)',
    'about.axios': 'Adapter layer switchable to get/post/put/delete',
    'about.engKey': 'Structure',
    'about.eng': 'Multi-file modules + component split',
    'about.ui': 'Hand-built dialog / table / tag components',
    'about.new': 'New in v2: themed click FX · EN/中文 switch · percentage layout · 🎃 Halloween skin (toggle top-right, auto-resets after the holiday)',
    'common.close': 'Close'
  }
};

/* 食堂名英文对照（数据仍是中文，只在英文界面里显示译文） */
const CANTEEN_EN = {
  '三立园1楼': 'Sanliyuan 1F',
  '三立园-1楼': 'Sanliyuan B1',
  '四季轩1楼': 'Sijixuan 1F',
  '四季轩-1楼': 'Sijixuan B1'
};

/* 订单方式英文对照 */
const ORDER_EN = {
  '现场点餐': 'Dine in',
  '现场点单': 'Order at counter',
  '扫码点餐': 'Scan to order',
  '小程序点餐': 'Mini program',
  '微信扫码': 'WeChat scan',
  '可提前预定': 'Pre-order'
};

/* =========================================================================
   二、餐厅基础数据（与 index.html 的 src/data/seed.js 完全一致，19 家）
   ========================================================================= */
const seedShops = [
  { canteen:"三立园1楼", shopName:"小米家",   desc:"早点去不然没肉了！",   dishes:["自选菜"], orderType:"现场点单" },
  { canteen:"三立园1楼", shopName:"海南鸡饭", desc:"海南鸡口水鸡手撕鸡，鸡味十足", dishes:["海南鸡","口水鸡","手撕鸡","豉油鸡","盐焗鸡","沙姜鸡"], orderType:"现场点餐" },
  { canteen:"三立园1楼", shopName:"袁记云饺", desc:"云饺扫码点餐，简单方便", dishes:[], orderType:"扫码点餐", qrcodeImg:"img/p3.jpg" },
  { canteen:"三立园1楼", shopName:"大众餐",   desc:"食堂大众窗口，丰俭由人", dishes:["自选菜"], orderType:"现场点单" },
  { canteen:"三立园1楼", shopName:"麻辣烫",   desc:"自选蔬菜加肉，热乎暖胃", dishes:["自选蔬菜加肉"], orderType:"现场点单" },
  { canteen:"三立园1楼", shopName:"沙县小吃", desc:"拌面云吞套餐饭，平价管饱", dishes:["拌面","云吞","套餐饭","粉面"], orderType:"扫码点餐", qrcodeImg:"img/p1.jpg" },
  { canteen:"三立园1楼", shopName:"及第粉",   desc:"鲜菇排骨、番茄牛腩，粉饭任选", dishes:["鲜菇排骨饭/粉","鲜番茄牛腩饭/粉","及第汤饭"], orderType:"扫码点餐" },
  { canteen:"三立园1楼", shopName:"匠心卤",   desc:"卤味炸物，追剧下饭都合适", dishes:["黑鸭","炸鸡","莲藕","鸡排","茄子","酥肉","卤肉"], orderType:"现场点餐" },
  { canteen:"三立园1楼", shopName:"浩记拉肠", desc:"粥粉面肠，清淡暖胃", dishes:["汤粉","生滚粥","清蒸粉","拉肠"], orderType:"现场点餐" },
  { canteen:"三立园-1楼", shopName:"麦当劳", desc:"babalababa~", dishes:["一加一套餐","咸蛋黄鸡腿堡三件套","新品套餐","大堡口福三件套"], orderType:"小程序点餐", qrcodeImg:"img/qr4.jpg" },
  { canteen:"四季轩1楼", shopName:"大众餐",   desc:"食堂大众窗口，丰俭由人", dishes:["两荤一素","一荤一素"], orderType:"现场点餐" },
  { canteen:"四季轩1楼", shopName:"麻辣烫",   desc:"自选蔬菜加肉，热乎暖胃", dishes:["自选麻辣烫"], orderType:"现场点单" },
  { canteen:"四季轩1楼", shopName:"湘小悦",   desc:"（待补充描述）", dishes:["（待补充菜品）"], orderType:"扫码点餐" },
  { canteen:"四季轩1楼", shopName:"一楼轻食", desc:"低卡轻食，健康无负担", dishes:["轻食"], orderType:"现场点单" },
  { canteen:"四季轩-1楼", shopName:"潮式猪杂汤饭", desc:"猪杂瘦肉粉面粿条，一碗热汤暖胃", dishes:["猪杂米粉","瘦肉米粉","猪杂粿条","瘦肉面","猪杂面","瘦肉粿条","鸡肉汤饭","猪肉丸汤饭","牛筋丸汤粉","墨鱼丸汤粉"], orderType:"现场点单" },
  { canteen:"四季轩-1楼", shopName:"抖勺君", desc:"先炸后炒小炒菜，偏油，口味清淡慎选", dishes:["农家小炒肉","肉末茄子","香菇炒肉","农家一碗香","土豆炒肉片","花菜炒腊肉","爆炒鸡腿肉"], orderType:"现场点餐" },
  { canteen:"四季轩-1楼", shopName:"柳州螺蛳粉", desc:"酸笋飘香，炸蛋烤肉任加", dishes:["原味螺蛳粉","炸蛋螺蛳粉","烤肉螺蛳粉"], orderType:"现场点单" },
  { canteen:"四季轩-1楼", shopName:"肉酱米线&饺子", desc:"肉酱米线配手工饺，简单扎实", dishes:["肉酱米线","饺子"], orderType:"现场点餐" },
  { canteen:"四季轩-1楼", shopName:"小街胡同牛杂面", desc:"牛杂汤面，实惠抗饿", dishes:["牛杂汤面","鸡腿汤面","番茄鸡蛋面","牛肚汤面"], orderType:"现场点餐" }
];

/* 忌口关键词库（与 src/utils/constants.js 一致） */
const KEY_LIB = {
  spicy:["麻辣","香辣","辣椒","川味","泡椒","螺蛳粉"],
  fried:["炸","香锅","油炸","煎饼"],
  cold: ["冰","冷饮","冻","冰凉"],
  heavy:["烧烤","烤肉","爆炒","干锅"]
};

/* 状态 -> 忌口类型（顺序即按钮顺序） */
const STATUS_MAP = {
  normal:      [],
  soreThroat:  ["spicy","fried","heavy"],
  cold:        ["cold","fried","heavy"],
  period:      ["cold"],
  stomachAche: ["spicy","fried","cold","heavy"],
  stomachPain: ["spicy","fried","cold","heavy"]
};

const ORDER_TAG = {
  "可提前预定":"success","微信扫码":"warning","扫码点餐":"warning",
  "小程序点餐":"info","现场点餐":"","现场点单":""
};

const ORDER_OPTIONS = ["现场点单","现场点餐","扫码点餐","小程序点餐","微信扫码","可提前预定"];
