// ===== Harmony i18n Engine =====
// 輕量級多國語系引擎，參考 aieduchat 設計

const i18n = {
  lang: 'zh-TW',
  data: {},

  init() {
    // 1. 從 localStorage 讀取
    const saved = localStorage.getItem('harmony_lang');
    // 2. 自動偵測瀏覽器語系
    const detected = this.detectLanguage();
    this.lang = saved || detected || 'zh-TW';

    // 3. 載入語系資料
    this.loadLocaleData();

    // 4. 渲染 DOM
    this.renderDOM();

    // 5. 更新語言選單
    this.updateSelectors();
  },

  detectLanguage() {
    const navLang = navigator.language || navigator.userLanguage;
    if (navLang.startsWith('zh-CN') || navLang.startsWith('zh-SG') || navLang.startsWith('zh-Hans')) {
      return 'zh-CN';
    }
    if (navLang.startsWith('zh')) {
      return 'zh-TW';
    }
    return 'en';
  },

  loadLocaleData() {
    // 語系資料由全域變數注入 (見 locales/*.js)
    const LOCALE_MAP = {
      'en': window.LOCALE_EN || {},
      'zh-TW': window.LOCALE_ZH_TW || {},
      'zh-CN': window.LOCALE_ZH_CN || {}
    };
    this.data = LOCALE_MAP[this.lang] || LOCALE_MAP['zh-TW'];
  },

  t(key, ...args) {
    // 以 dot path 讀取巢狀物件
    const keys = key.split('.');
    let value = this.data;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // 找不到回傳 key 本身
      }
    }
    // 參數取代 {0} {1} ...
    if (typeof value === 'string' && args.length > 0) {
      return value.replace(/{(\d+)}/g, (match, index) => args[index] !== undefined ? args[index] : match);
    }
    return value;
  },

  setLanguage(lang) {
    if (!['en', 'zh-TW', 'zh-CN'].includes(lang)) return;
    this.lang = lang;
    localStorage.setItem('harmony_lang', lang);
    this.loadLocaleData();
    this.renderDOM();
    this.updateSelectors();
    // 廣播語系變更事件
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
  },

  renderDOM() {
    // 處理 [data-i18n] 元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = this.t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translated;
      } else {
        el.textContent = translated;
      }
    });

    // 處理 [data-i18n-placeholder] 元素
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    // 處理 [data-i18n-title] 元素
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });
  },

  updateSelectors() {
    document.querySelectorAll('.lang-selector').forEach(sel => {
      sel.value = this.lang;
    });
  }
};

// 全域初始化函數
window.i18nInit = () => i18n.init();
window.t = (key, ...args) => i18n.t(key, ...args);
window.setLanguage = (lang) => i18n.setLanguage(lang);

// 暴露 i18n 物件供進階使用
window.i18n = i18n;