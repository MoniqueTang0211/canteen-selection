/* =========================================================================
   app.js —— 逻辑与界面层
   ---------------------------------------------------------------------------
   顺序：纯函数区 → Canvas 粒子特效 → Vue 应用（Options API）。
   依赖：vendor/vue.global.prod.js（全局 Vue）、data.js（数据与常量）。
   ========================================================================= */

/* =========================================================================
   三、纯函数区（沿用 v1 思路：算法与界面解耦，便于测试与复用）
   ========================================================================= */
function splitInput(raw){
  return String(raw || "").split(/[,，、;；\s]+/).map(s=>s.trim()).filter(Boolean);
}
function avoidHits(shop, forbidTypes){
  if(!forbidTypes || !forbidTypes.length) return [];
  const text = shop.shopName + " " + shop.desc + " " + (shop.dishes||[]).join(" ");
  const hit = [];
  forbidTypes.forEach(t => (KEY_LIB[t]||[]).forEach(kw => { if(text.includes(kw)) hit.push(t); }));
  return [...new Set(hit)];
}
function filterByAvoid(pool, forbidTypes){
  if(!forbidTypes || !forbidTypes.length) return pool;
  return pool.filter(s => avoidHits(s, forbidTypes).length === 0);
}
function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function pickRecommendDish(shop, forbidTypes){
  const dishes = shop.dishes || [];
  if(!dishes.length) return "";
  const forbidden = (forbidTypes||[]).flatMap(t => KEY_LIB[t]||[]);
  const pool = dishes.filter(d => !forbidden.some(kw => d.includes(kw)));
  return pool.length ? pickRandom(pool) : "";
}

/* =========================================================================
   四、点击特效（Canvas 2D 粒子系统 · 支持主题）
   ---------------------------------------------------------------------------
   知识点：不用 CSS 动画，而是用 <canvas> + requestAnimationFrame 逐帧绘制，
   粒子带速度/重力/旋转/寿命，寿终或飞出屏幕即回收，粒子清空后自动停帧省电。

   主题化设计：同一套粒子引擎，按 kind 字段派发不同的绘制函数——
     · 日常主题：star  = 五角星
     · 万圣节：  drop  = 血滴（带拖尾）
                 bat   = 蝙蝠（二次贝塞尔勾翅膀，flap 相位做扑翼）
                 spark = 橙紫火花（旋转菱形）
   这样"换主题"只是换粒子配方，引擎本身不用重写 → 低耦合。
   无障碍：系统开启「减少动效」时直接不生成粒子。
   ========================================================================= */
const StarFX = (function(){
  const canvas = document.createElement("canvas");
  canvas.className = "fx-canvas";
  canvas.setAttribute("aria-hidden", "true");   // 纯装饰，读屏忽略
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 两套粒子配色 */
  const PALETTE = {
    default:  ["#E07A98","#EFA45A","#F4C15D","#8FBF9F","#7FA9C9","#E8A0B4","#FFFFFF"],
    halloween:["#FF7A2F","#FFB347","#B26BFF","#C87BFF","#FFD08A"]
  };
  const DROP_COLORS = ["#B31F35","#8E1B2E","#D62A45","#7A1024"];  // 血滴
  const BAT_COLORS  = ["#B26BFF","#8B3FD9","#C87BFF"];            // 蝙蝠（亮紫才看得见）

  let theme = "default", dpr = 1, W = 0, H = 0, parts = [], raf = 0;

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, 2);   // 限制 2 倍，避免大屏耗性能
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------- 绘制函数：每个只管"长什么样" ---------- */
  // 五角星（日常主题）
  function drawStar(cx, cy, spikes, outer, inner, rot){
    let rotStep = Math.PI / spikes, x = cx, y = cy - outer;
    ctx.beginPath(); ctx.moveTo(cx, cy - outer);
    for(let i = 0; i < spikes; i++){
      x = cx + Math.cos(rot + i * rotStep * 2 - Math.PI/2) * outer;
      y = cy + Math.sin(rot + i * rotStep * 2 - Math.PI/2) * outer;
      ctx.lineTo(x, y);
      x = cx + Math.cos(rot + i * rotStep * 2 + rotStep - Math.PI/2) * inner;
      y = cy + Math.sin(rot + i * rotStep * 2 + rotStep - Math.PI/2) * inner;
      ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  }

  // 血滴：一段沿速度反方向的拖尾 + 一个椭圆主体
  function drawDrop(p){
    const r = p.size * 0.5;
    const sp = Math.hypot(p.vx, p.vy) || 1;
    const tx = p.x - (p.vx / sp) * r * 2.6;
    const ty = p.y - (p.vy / sp) * r * 2.6;
    const a = ctx.globalAlpha;
    ctx.strokeStyle = p.color; ctx.lineWidth = r * 1.05; ctx.lineCap = "round";
    ctx.globalAlpha = a * 0.45;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 1.2, 0, 0, 6.283); ctx.fill();
  }

  // 蝙蝠：二次贝塞尔勾出双翼，flap 相位控制翅膀张开幅度（扑翼）
  function drawBat(p){
    const s = p.size, flap = Math.sin(p.flap) * 0.5 + 0.5;   // 0..1
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x - s*0.70, p.y - s*(0.55 + flap*0.55), p.x - s*1.60, p.y - s*(0.10 + flap*0.25));
    ctx.quadraticCurveTo(p.x - s*0.95, p.y + s*0.42, p.x, p.y + s*0.28);
    ctx.quadraticCurveTo(p.x + s*0.95, p.y + s*0.42, p.x + s*1.60, p.y - s*(0.10 + flap*0.25));
    ctx.quadraticCurveTo(p.x + s*0.70, p.y - s*(0.55 + flap*0.55), p.x, p.y);
    ctx.closePath(); ctx.fill();
  }

  // 火花：旋转的小菱形
  function drawSpark(p){
    const s = p.size * 0.62;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s*0.45, 0); ctx.lineTo(0, s); ctx.lineTo(-s*0.45, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* ---------- 主循环：按 kind 派发 ---------- */
  function loop(){
    ctx.clearRect(0, 0, W, H);
    for(let i = parts.length - 1; i >= 0; i--){
      const p = parts[i];
      p.vy += p.g;                 // 重力
      p.vx *= 0.995;               // 空气阻力
      p.x += p.vx; p.y += p.vy;
      p.rot += p.vr;
      if(p.flap !== undefined) p.flap += p.flapSp;   // 扑翼相位
      p.life--;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife * 1.7));
      if(p.kind === "drop")       drawDrop(p);
      else if(p.kind === "bat")   drawBat(p);
      else if(p.kind === "spark") drawSpark(p);
      else                        drawStar(p.x, p.y, 5, p.size, p.size * 0.45, p.rot);
      if(p.life <= 0 || p.y > H + 60) parts.splice(i, 1);
    }
    ctx.globalAlpha = 1;
    if(parts.length) raf = requestAnimationFrame(loop);
    else { raf = 0; ctx.clearRect(0, 0, W, H); }   // 没有粒子就停帧
  }

  /* ---------- 在点击位置四散爆开 ---------- */
  function burst(x, y, n){
    if(reduce) return;
    const pal = PALETTE[theme] || PALETTE.default;
    for(let i = 0; i < n; i++){
      const ang = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 4.5;
      const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp - 3;
      const rot = Math.random() * 6.28, vr = (Math.random() - 0.5) * 0.25;

      if(theme === "halloween"){
        const roll = Math.random();
        if(roll < 0.45){          // 45% 血滴
          parts.push({ kind:"drop", x, y, vx, vy, g: 0.22 + Math.random()*0.12,
            rot, vr, size: 5 + Math.random()*7,
            life: 55 + Math.random()*40, maxLife: 95,
            color: DROP_COLORS[(Math.random()*DROP_COLORS.length)|0] });
        }else if(roll < 0.65){    // 20% 蝙蝠（略向上飘，翅膀扑动）
          parts.push({ kind:"bat", x, y, vx: vx*1.7, vy: vy*0.62, g: -0.015,
            rot: 0, vr: 0, size: 5 + Math.random()*4.5,
            flap: Math.random()*6.28, flapSp: 0.34 + Math.random()*0.26,
            life: 78 + Math.random()*42, maxLife: 120,
            color: BAT_COLORS[(Math.random()*BAT_COLORS.length)|0] });
        }else{                    // 35% 橙紫火花
          parts.push({ kind:"spark", x, y, vx, vy, g: 0.14, rot, vr,
            size: 4 + Math.random()*6,
            life: 40 + Math.random()*30, maxLife: 70,
            color: pal[(Math.random()*pal.length)|0] });
        }
      }else{
        parts.push({ kind:"star", x, y, vx, vy, g: 0.16 + Math.random()*0.08,
          rot, vr, size: 4 + Math.random()*7,
          life: 55 + Math.random()*40, maxLife: 95,
          color: pal[(Math.random()*pal.length)|0] });
      }
    }
    if(!raf) raf = requestAnimationFrame(loop);
  }

  /* ---------- 从顶部落下（主按钮触发的那场"雨"） ---------- */
  function rain(n){
    if(reduce) return;
    const pal = PALETTE[theme] || PALETTE.default;
    for(let i = 0; i < n; i++){
      if(theme === "halloween"){
        const isBat = Math.random() < 0.22;
        parts.push({
          kind: isBat ? "bat" : "drop",
          x: Math.random() * W, y: -20 - Math.random() * 160,
          vx: isBat ? (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random()*1.2) : (Math.random()-0.5)*0.7,
          vy: isBat ? 0.5 + Math.random()*0.8 : 1.6 + Math.random()*2.4,
          g: isBat ? 0 : 0.045 + Math.random()*0.04,
          rot: 0, vr: 0,
          flap: Math.random()*6.28, flapSp: 0.4 + Math.random()*0.3,
          size: isBat ? 5 + Math.random()*4 : 4 + Math.random()*6,
          life: 200 + Math.random()*100, maxLife: 300,
          color: isBat ? BAT_COLORS[(Math.random()*BAT_COLORS.length)|0]
                       : DROP_COLORS[(Math.random()*DROP_COLORS.length)|0]
        });
      }else{
        parts.push({
          kind:"star", x: Math.random() * W, y: -20 - Math.random() * 140,
          vx: (Math.random()-0.5)*1.2, vy: 1 + Math.random()*2.6,
          g: 0.05 + Math.random()*0.05,
          rot: Math.random()*6.28, vr: (Math.random()-0.5)*0.2,
          size: 5 + Math.random()*8,
          life: 160 + Math.random()*90, maxLife: 250,
          color: pal[(Math.random()*pal.length)|0]
        });
      }
    }
    if(!raf) raf = requestAnimationFrame(loop);
  }

  /* 事件委托：点到按钮类元素就触发；主按钮额外加一场"雨" */
  document.addEventListener("click", function(e){
    const el = e.target.closest(".btn, .chip, .tab, .lang, .corner-btn, .theme-btn");
    if(!el) return;
    if(el.classList.contains("btn--primary")){
      burst(e.clientX, e.clientY, 34);
      rain(26);
    }else{
      burst(e.clientX, e.clientY, 14);
    }
  });

  /* 切主题时切换粒子配方 */
  function setTheme(t){
    theme = (t === "halloween") ? "halloween" : "default";
    parts.length = 0;            // 清掉旧配方的粒子，避免混色
  }

  return { burst, rain, setTheme };
})();

/* =========================================================================
   五、Vue 应用（Options API：data / computed / methods / mounted）
   ========================================================================= */
const { createApp } = Vue;
const LS_SHOPS = "canteen_v2_user_shops";   // v2 用独立存储键，不干扰原版数据
const LS_LANG  = "canteen_v2_lang";
const LS_THEME = "canteen_v2_theme";        // 主题选择："halloween" / "default"

/* =========================================================================
   主题系统：日常 ⇄ 万圣节
   ---------------------------------------------------------------------------
   知识点：主题 = 给 <html> 加一个 data-theme 属性 + 一套 CSS 变量覆盖
   （见 <style> 里的 html[data-theme="halloween"]）。JS 只改这一个属性，
   所有组件样式由 CSS 自动接管 → 换肤零侵入，不用给每个组件写 if 判断。

   ★ 自动恢复规则（这就是"万圣节之后能不能变回去"的答案）★
     · 从没手动切过   → 按日期自动：10/20 ~ 11/02 万圣节，其余时间日常；
     · 手动切到「日常」 → 写入记忆，永久回日常；
     · 手动切到「万圣节」→ 只在节日窗口内记忆；窗口外仅本次会话生效，
       刷新即回日常。所以无论怎么点，节后一定自动恢复，不会卡在节日皮肤。
   ========================================================================= */
const HALLOWEEN_WINDOW = { fromMonth: 10, fromDay: 20, toMonth: 11, toDay: 2 };

function inHalloweenWindow(d){
  d = d || new Date();
  const m = d.getMonth() + 1, day = d.getDate();
  if(m === HALLOWEEN_WINDOW.fromMonth && day >= HALLOWEEN_WINDOW.fromDay) return true;
  if(m === HALLOWEEN_WINDOW.toMonth   && day <= HALLOWEEN_WINDOW.toDay)   return true;
  return false;
}
function autoTheme(){ return inHalloweenWindow() ? "halloween" : "default"; }

createApp({
  data(){
    return {
      // 读取上次选择的语言（file:// 等特殊环境下 localStorage 可能不可用，做兜底）
      lang: (function(){ try{ return localStorage.getItem(LS_LANG) || "zh"; }catch(e){ return "zh"; } })(),
      // 主题：优先用上次的选择；从没选过就按日期自动判断（节日期间自动开万圣节）
      theme: (function(){
        try{
          const v = localStorage.getItem(LS_THEME);
          if(v === "halloween" || v === "default") return v;
        }catch(e){ /* 忽略 */ }
        return autoTheme();
      })(),
      statusKeys: Object.keys(STATUS_MAP),
      orderOptions: ORDER_OPTIONS,
      currentView: "recommend",
      selectStatus: "normal",
      selectCanteen: [],
      userShops: [],
      resultShop: null,
      recommendDish: "",
      loading: false,
      showResult: false,
      showAdd: false,
      showQr: false,
      showAbout: false,
      currentQr: "",
      qrShopName: "",
      qrOrderType: "",
      qrImgError: false,
      toast: "",
      petShow: false,          // 台词气泡是否显示
      petSaid: "",             // 当前这句台词
      petIdx: 0,               // 第几句（循环取 1~4）
      petPoke: false,          // 是否正在播"蹦一下"的动画
      form: { shopName:"", canteen:"", orderType:"现场点餐", dishes:"", desc:"" }
    };
  },

  computed: {
    shopList(){ return seedShops.concat(this.userShops); },
    allCanteen(){
      const out = [];
      this.shopList.forEach(s => { if(!out.includes(s.canteen)) out.push(s.canteen); });
      return out;
    },
    allCanteenSelected(){ return this.selectCanteen.length === this.allCanteen.length; },
    healthTip(){ return this.t("hint." + this.selectStatus); }
  },

  async mounted(){
    this.userShops = this.loadUserShops();
    this.selectCanteen = [...this.allCanteen];
    document.documentElement.lang = this.lang === "zh" ? "zh-CN" : "en";
    this.applyTheme();     // 把主题属性落到 <html>，并同步粒子配方
  },

  methods: {
    /* ---------- i18n：取当前语言文案 ---------- */
    t(key, params){
      const dict = I18N[this.lang] || I18N.zh;
      let s = dict[key];
      if(s == null) s = I18N.zh[key] != null ? I18N.zh[key] : key;
      if(params) Object.keys(params).forEach(k => { s = s.replace("{" + k + "}", params[k]); });
      return s;
    },
    toggleLang(){
      this.lang = this.lang === "zh" ? "en" : "zh";
      try{ localStorage.setItem(LS_LANG, this.lang); }catch(e){ /* 忽略：隐私模式/文件协议 */ }
      document.documentElement.lang = this.lang === "zh" ? "zh-CN" : "en";
    },

    /* ---------- 页面小宠物：点一下弹一下 + 说一句话（极简版） ---------- */
    petTap(){
      const i = (this.petIdx % 4) + 1;      // 台词循环：1→2→3→4→1…
      this.petIdx++;
      this.petSaid = this.t("pet.l" + i);   // 台词也在字典里，切语言自动跟着变
      this.petShow = true;

      /* 让动画能重复播放：先摘掉 class，等 Vue 更新完 DOM 再加回来
         （直接加 class 浏览器会认为没变化，动画不会重播） */
      this.petPoke = false;
      this.$nextTick(() => { this.petPoke = true; });

      clearTimeout(this.petTimer);
      this.petTimer = setTimeout(() => { this.petShow = false; }, 2600);
    },

    /* ---------- 主题：应用到 DOM / 一键切换 ---------- */
    applyTheme(){
      document.documentElement.setAttribute("data-theme", this.theme);
      StarFX.setTheme(this.theme);     // 同步切换粒子配方（星星 ⇄ 血滴+蝙蝠）
    },
    toggleTheme(){
      const next = this.theme === "halloween" ? "default" : "halloween";
      this.theme = next;
      this.applyTheme();

      /* 记忆规则：日常常驻；万圣节只在节日窗口内常驻，窗口外仅本次会话有效 */
      try{
        if(next === "halloween"){
          if(inHalloweenWindow()) localStorage.setItem(LS_THEME, "halloween");
          else localStorage.removeItem(LS_THEME);   // 非节日期间不落盘 → 刷新即回日常
        }else{
          localStorage.setItem(LS_THEME, "default");
        }
      }catch(e){ /* 隐私模式 / file:// 忽略 */ }

      /* 切主题时来一场专属特效：开=蝙蝠+血滴，关=星星 */
      StarFX.burst(window.innerWidth / 2, window.innerHeight * 0.42, 26);
      StarFX.rain(14);

      this.toast = next === "halloween" ? this.t("theme.onToast") : this.t("theme.offToast");
      this.autoHideToast();
    },
    canteenLabel(c){ return this.lang === "zh" ? c : (CANTEEN_EN[c] || c); },
    orderLabel(o){ return this.lang === "zh" ? o : (ORDER_EN[o] || o); },
    orderTagType(type){ return ORDER_TAG[type] || ""; },

    /* ---------- 选择逻辑 ---------- */
    toggleCanteen(c){
      const i = this.selectCanteen.indexOf(c);
      if(i >= 0) this.selectCanteen.splice(i, 1);
      else this.selectCanteen.push(c);
    },
    toggleAllCanteen(){
      this.selectCanteen = this.allCanteenSelected ? [] : [...this.allCanteen];
    },

    /* ---------- 推荐：筛选 -> 随机 -> 弹窗 ---------- */
    pickRecommend(){
      const forbid = STATUS_MAP[this.selectStatus] || [];
      let pool = this.shopList.filter(s => this.selectCanteen.includes(s.canteen));
      pool = filterByAvoid(pool, forbid);
      if(!pool.length){
        this.toast = this.t("toast.noResult");
        this.autoHideToast();
        return;
      }
      this.loading = true;
      setTimeout(() => {
        const shop = pickRandom(pool);
        this.resultShop = shop;
        this.recommendDish = pickRecommendDish(shop, forbid);
        this.showResult = true;
        this.loading = false;
      }, 450);
    },

    /* ---------- 增 / 删（localStorage 持久化，v2 独立键） ---------- */
    loadUserShops(){
      try{ return JSON.parse(localStorage.getItem(LS_SHOPS) || "[]"); }
      catch(e){ return []; }
    },
    saveUserShops(){
      try{ localStorage.setItem(LS_SHOPS, JSON.stringify(this.userShops)); }catch(e){ /* 存储不可用时只保留内存态 */ }
    },
    openAdd(){
      this.form = { shopName:"", canteen:"", orderType:"现场点餐", dishes:"", desc:"" };
      this.showAdd = true;
    },
    saveShop(){
      if(!this.form.shopName){
        this.toast = this.t("toast.nameRequired"); this.autoHideToast(); return;
      }
      const dishes = splitInput(this.form.dishes);
      const autoDesc = this.lang === "zh"
        ? (dishes.length ? "📌 " + this.form.shopName + "（" + dishes.slice(0,3).join("、") + "），值得一试~"
                         : "📌 " + this.form.shopName + "，等你来探索~")
        : (dishes.length ? "📌 " + this.form.shopName + " (" + dishes.slice(0,3).join(", ") + "), worth a try~"
                         : "📌 " + this.form.shopName + " — come explore~");
      const shop = {
        id: "u_" + Date.now(),
        canteen: this.form.canteen || this.allCanteen[0] || "未分类",
        shopName: this.form.shopName,
        desc: this.form.desc || autoDesc,
        dishes,
        orderType: this.form.orderType
      };
      this.userShops.push(shop);
      this.saveUserShops();
      this.toast = this.t("toast.added", { name: shop.shopName });
      this.autoHideToast();
      this.showAdd = false;
      if(!this.selectCanteen.includes(shop.canteen)) this.selectCanteen.push(shop.canteen);
    },
    removeShop(shop){
      const i = this.userShops.findIndex(s => s.id === shop.id);
      if(i < 0) return;
      this.userShops.splice(i, 1);
      this.saveUserShops();
      this.toast = this.t("toast.deleted", { name: shop.shopName });
      this.autoHideToast();
    },

    /* ---------- 二维码 / 点餐方式 ---------- */
    showQrFor(shop){
      this.currentQr = shop.qrcodeImg || "";
      this.qrShopName = shop.shopName;
      this.qrOrderType = shop.orderType;
      this.qrImgError = false;
      this.showQr = true;
    },
    qrNeedImage(type){ return type === "扫码点餐" || type === "微信扫码"; },
    qrBtnLabel(shop){
      if(shop.qrcodeImg) return this.t("qr.btn");
      return this.qrNeedImage(shop.orderType) ? this.t("qr.btn") : this.t("qr.orderBtn");
    },
    qrFallbackTip(type){
      if(this.qrNeedImage(type)) return this.t("qr.tip.pending");
      if(type === "小程序点餐") return this.t("qr.tip.mini");
      if(type === "可提前预定") return this.t("qr.tip.reserve");
      return this.t("qr.tip.dinein");
    },

    autoHideToast(){
      clearTimeout(this._t);
      this._t = setTimeout(() => { this.toast = ""; }, 1800);
    }
  }
}).mount("#app");
