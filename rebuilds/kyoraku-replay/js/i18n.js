/* Kyoraku Replay - tiny bilingual dictionary (Arabic / English). */
(function (RL) {
  'use strict';

  const AR = {
    appName: 'Kyoraku Replay',
    appSub: 'KYORAKU REPLAY',
    tagline: 'إعادة السوق · تدرّب بلا مخاطرة',
    freeBadge: '100% مجاني · بلا خطط مدفوعة · بلا حساب',
    advanced: 'إدارة متقدمة للصفقة',
    trailEnable: 'Trailing Stop · وقف متحرك', trailStart: 'يبدأ بعد (R)', trailDist: 'المسافة (بيب)',
    autoPartial: 'إغلاق جزئي أوتوماتيكي', partialAt: 'عند بلوغ (R)', partialPct: 'نسبة الإغلاق %',
    advancedNote: 'الوقف المتحرك كيتحرك غير فاتجاه الربح، والإغلاق الجزئي كيولّي سطر مستقل فالدفتر مع R ديالو.',
    partialHint: 'إغلاق جزئي:',
    realGroup: 'بيانات حقيقية · مدمجة (MIT)', demoGroup: 'بيانات تجريبية', customGroup: 'بياناتك (CSV / مباشر)',
    realData: 'بيانات حقيقية', liveData: 'بيانات حقيقية مباشرة (اختياري)', liveAsset: 'الأصل',
    liveInterval: 'الإطار', liveRange: 'المدة', loadLive: 'حمّل مباشر',
    liveNote: 'البيانات الحقيقية المدمجة كتخدم أوفلاين بلا حتى طلب على الإنترنت. إلى بغيتي تحديث حي، اختار الأصل واضغط «حمّل مباشر»: كيتمّ المرور من /api/ohlcv (Vercel) ولا من CORS relay عام. حتى شي مفتاح API.',
    liveLegal: 'Yahoo Finance بيانات وقت التشغيل فقط، ما كتخزّنش ولا كتعاود التوزيع من المشروع. للاستعمال التجاري استعمل فيد مرخّص ديالك (شوف docs/DATA.md).',
    attributionNote: 'البيانات المدمجة مرخّصة MIT من GetData Finance — الإسناد الكامل فـ ATTRIBUTION.md و data/README.md.',
    toastRealLoading: 'كيتحمّل ملف البيانات الحقيقية…', toastRealOk: 'تحمّلات بيانات حقيقية ✅',
    toastRealError: 'تعذّر تحميل البيانات', toastLiveOk: 'تحمّلات بيانات مباشرة ✅',
    toastLiveError: 'ما قدرناش نجيبو البيانات المباشرة: جرّب CSV ولا البيانات المدمجة',
    toastPartial: 'تغلقات حصة من الصفقة ✅',
    helpRealTitle: '5 · بيانات حقيقية + وقف متحرك + إغلاق جزئي',
    helpReal: 'كاين 10 أسواق حقيقية مدمجة بترخيص MIT (NQ E-mini، NAS100USD، US30، SPX500، GER30، JPN225، EUR/USD، USD/JPY، XAU/USD، USOIL) كتخدمو أوفلاين، مع تحديث مباشر اختياري واستيراد CSV. الوقف المتحرك كيتبع القمة/القاع من بعد بلوغ R، والإغلاق الجزئي كيقسّم الصفقة لأسطر مستقلة فالدفتر باش التحليلات تبقى صحيحة، والرجوع للور كيعيد الحجم.',
    legalTitle: '6 · الترخيص والمسؤولية',
    legalText: 'Kyoraku Replay كود أصلي مرخّص MIT OR Apache-2.0؛ بيانات السوق المدمجة MIT مع الإسناد فـ ATTRIBUTION.md. أداة تعليمية/محاكاة: ماشي وسيط، ما كتنفّذش صفقات حقيقية، ما كتحتفظش بفلوس، وماشي نصيحة مالية. البيانات مباشرة من Yahoo خاضعة لشروطهم؛ للبيع التجاري الواسع استعمل فيد مرخّص.',
    help: 'كيفاش خدام؟',
    reset: 'جلسة جديدة', rewind: 'رجوع 20 شمعة', prev: 'شمعة لور', play: '▶ تشغيل', pause: '⏸ توقف', next: 'شمعة لقدام',
    speed: 'السرعة', goTo: 'اذهب إلى تاريخ', go: 'اذهب', balance: 'الرصيد', equity: 'القيمة', dd: 'أقصى سحب', clock: 'الوقت (UTC)',
    lang: 'English',
    market: 'السوق', symbol: 'الأصل', timeframe: 'الإطار الزمني', htfChart: 'شارت إطار أعلى', indicators: 'المؤشرات',
    volume: 'الحجم', showTrades: 'إظهار الصفقات', zoomHint: 'عجلة الفأرة = تكبير · السحب = تنقل',
    session: 'إعدادات الجلسة', startBalance: 'رصيد البداية', riskPct: 'المخاطرة لكل صفقة %', spread: 'السبريد (بيب)',
    commission: 'عمولة / لوت', slPips: 'الوقف (بيب)', rr: 'الهدف (R)', autoBE: 'نقل الوقف لنقطة الدخول تلقائياً', beR: 'عند بلوغ (R)',
    propEnable: 'محاكاة شروط شركة التمويل', target: 'هدف الربح %', dailyLimit: 'خسارة يومية قصوى %', totalLimit: 'سحب كلي أقصى %', minDays: 'أقل عدد أيام',
    saveSession: 'احفظ الجلسة', newSession: 'ابدأ جلسة فارغة', archived: 'جلسات محفوظة', open: 'افتح', del: 'حذف',
    order: 'فتح صفقة', buy: 'شراء / Long', sell: 'بيع / Short', customLevels: 'أسعار مخصصة', slPrice: 'سعر الوقف', tpPrice: 'سعر الهدف',
    pick: 'اختر من الشارت', computedSize: 'الحجم المحسوب', riskAmount: 'المبلغ المعرض للخطر', closeAll: 'أغلق الكل',
    positions: 'الصفقات المفتوحة', close: 'إغلاق', noPositions: 'لا توجد صفقات مفتوحة', tagsLabel: 'وسوم (افصل بفاصلة)', notesLabel: 'ملاحظات',
    tabJournal: 'الدفتر', tabAnalytics: 'التحليلات', tabMonte: 'مونت كارلو', tabProp: 'شركة التمويل', tabData: 'البيانات',
    allSessions: 'كل الجلسات', thisSession: 'هذه الجلسة فقط', filterSide: 'الاتجاه', filterResult: 'النتيجة', all: 'الكل',
    winners: 'رابحة', losers: 'خاسرة', tagFilter: 'ابحث في الوسوم/الملاحظات', exportCsv: 'تصدير CSV',
    colId: '#', colSymbol: 'الأصل', colSide: 'الاتجاه', colEntry: 'الدخول', colExit: 'الخروج', colPnl: 'الربح/الخسارة', colR: 'R', colReason: 'السبب', colNotes: 'ملاحظات / وسوم', colAction: '',
    netPnl: 'صافي الربح', winRate: 'نسبة النجاح', profitFactor: 'عامل الربح', avgR: 'متوسط R', maxDDStat: 'أقصى سحب', tradesCount: 'الصفقات',
    expectancy: 'التوقع لكل صفقة', equityCurve: 'منحنى رأس المال', rDistribution: 'توزيع نتائج R', hourlyPnl: 'الربح حسب الساعة (UTC)', weekdayPnl: 'الربح حسب اليوم', calendar: 'تقويم الربح والخسارة', noData: 'ما كاين حتى صفقة مغلقة حتى دابا. لعب الـ Replay وافتحي صفقة باش تشوفي التحليلات.',
    longShort: 'Long / Short', openNow: 'مفتوحة',
    mcTitle: 'مونت كارلو: واش كيحدث لو بقيتي كتكرر نفس الأداء؟', mcNote: 'كيعيد ترتيب نتائج صفقاتك الحقيقية بطريقة عشوائية. ماشي توقع للسوق، غير احتمالات على سلوكك.',
    mcTrades: 'عدد الصفقات', mcRuns: 'عدد المحاكاات', mcRun: 'شغّل المحاكاة', mcP5: 'سيناريو سيء (5%)', mcMedian: 'النتيجة المتوسطة', mcP95: 'سيناريو مزيان (95%)', mcProfitable: 'احتمال ربح', mcBust: 'احتمال كسر قاعدة السحب', mcFinal: 'توزيع النتيجة النهائية',
    propStatus: 'الحالة', propActive: 'جارية', propPassed: 'نجحت ✅', propFailed: 'فشلت ❌', propProgress: 'التقدم نحو الهدف', propViolations: 'الخرقات', noViolations: 'حتى خرق حتى دابا 👍', tradingDays: 'أيام التداول', dailyUse: 'الخسارة اليومية المستعملة', totalUse: 'السحب الكلي المستعمل',
    dataTitle: 'بيانات مجانية 100%', csvNote: 'جيب بيانات OHLCV مجانية من أي مصدر (MT4/MT5 export، Stooq، Yahoo، Dukascopy، Binance)، ولا استعمل البيانات التجريبية المولّدة محلياً. حتى شي طلب على الإنترنت ما كيدوزش من هنا.',
    csvSymbol: 'رمز الأصل', csvPip: 'حجم البيب', csvContract: 'قيمة العقد', csvDecimals: 'الأرقام العشرية', loadCsv: 'حمّل ملف CSV',
    exportJson: 'تصدير نسخة احتياطية (JSON)', importJson: 'استيراد نسخة احتياطية', exportPng: 'صورة للشارت PNG', clearAll: 'امسح كل البيانات المحلية',
    localNote: 'كلشي كيتخزن فـ localStorage ديال المتصفح ديالك: ما كاين سيرفر، ما كاين حساب، ما كاين تتبع، ما كاين حدود.',
    freeSources: 'مصادر بيانات مجانية مقترحة',
    helpTitle: 'كيفاش خدام Kyoraku Replay؟',
    help1Title: '1 · إعادة التاريخ شمعة بشمعة',
    help1: 'الشارت كيوريك غير الشمعات اللي وقتهم قدّام «مؤشر الوقت» أو قبل منو. المستقبل مخفي، داكشي علاش كتحس براسك كيتداول حقيقي. «تشغيل» كيزيد شمعة شمعة، و«اذهب إلى» كينقلّك لأي تاريخ، و«رجوع» كيرجّع ويحيّد الصفقات اللي دخلات من بعد.',
    help2Title: '2 · التنفيذ والمخاطرة',
    help2: 'كل صفقة كتدخل بسعر إغلاق الشمعة الحالية + نص السبريد. كتحط الوقف والهدف، والبرنامج كيحسب الحجم باش الخسارة القصوى تكون = نسبة المخاطرة × الرصيد. فكل شمعة جديدة كيتفحص الهاي واللو: الوقف كيتحسب قبل الهدف (تقدير متحفظ). كاين نقل تلقائي لنقطة الدخول وعمولة وسحب.',
    help3Title: '3 · الدفتر والتحليلات',
    help3: 'كل صفقة كتسجّل أوتوماتيكياً مع R ديالها، الوسوم والملاحظات. كتشوف منحنى رأس المال، نسبة النجاح، عامل الربح، السحب، الربح حسب الساعة، التقويم، ومحاكاة مونت كارلو + قواعد شركات التمويل. حتى شي «خطة پرو» ما كاينة: كل الميزات مفتوحة.',
    help4Title: '4 · علاش مجاني؟',
    help4: 'الكود كامل محلي (HTML/CSS/JS بلا مكتبات مدفوعة)، البيانات إما مولّدة بشكل حتمي ولا CSV ديالك، والتخزين فالمتصفح. ما كاين حتى API باش نخلّصو عليه، ولا حساب، ولا اشتراك. تقدر تفتحو حتى بلا إنترنت.',
    helpClose: 'فهمت ✅',
    toastNoFuture: 'وصلتي لآخر شمعة ✅', toastTrade: 'تفتحات الصفقة ✅', toastBadLevels: 'الوقف والهدف خاص يكونو فالجهة الصحيحة', toastSaved: 'تخزّنات الجلسة ✅', toastCsv: 'تحمّلات البيانات ✅', toastCsvError: 'الملف ما تقرّاش', toastStorage: 'التخزين المحلي ممتلئ: صدّر نسخة احتياطية', toastReset: 'جلسة جديدة ✅', toastNeedTrades: 'خاصك على الأقل 5 صفقات مغلقة', toastJsonError: 'الملف JSON ماشي صالح', toastCleared: 'تمسحات كلشي ✅', toastExport: 'تصدّر الملف ✅',
    reasonSl: 'وقف', reasonTp: 'هدف', reasonManual: 'يدوي', reasonGap: 'فجوة', reasonSwitch: 'تبديل السوق',
    reasonPartial: 'جزئي', reasonAutoPartial: 'جزئي آلي',
    dayNames: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  };

  const EN = {
    appName: 'Kyoraku Replay',
    appSub: 'KYORAKU REPLAY',
    tagline: 'Replay the market · practise without risk',
    freeBadge: '100% free · No paid plans · No account',
    advanced: 'Advanced trade management',
    trailEnable: 'Trailing Stop', trailStart: 'Activate after (R)', trailDist: 'Distance (pips)',
    autoPartial: 'Automatic partial close', partialAt: 'Trigger at (R)', partialPct: 'Close %',
    advancedNote: 'Trailing only tightens in your favour. A partial close becomes its own journal row with its own R; rewind restores the size.',
    partialHint: 'Partial close:',
    realGroup: 'Real data · bundled (MIT)', demoGroup: 'Demo data', customGroup: 'Your data (CSV / live)',
    realData: 'Real data', liveData: 'Optional live real data', liveAsset: 'Asset',
    liveInterval: 'Interval', liveRange: 'Range', loadLive: 'Load live',
    liveNote: 'Bundled real data works offline with zero network requests. For a live refresh, choose an asset and press Load live: it goes through /api/ohlcv (Vercel) or a public CORS relay. No API key.',
    liveLegal: 'Yahoo Finance data is fetched at runtime only; this project does not store or redistribute it. For commercial use, connect your own licensed feed (see docs/DATA.md).',
    attributionNote: 'Bundled datasets are MIT-licensed from GetData Finance — full attribution in ATTRIBUTION.md and data/README.md.',
    toastRealLoading: 'Loading real market data…', toastRealOk: 'Real market data loaded ✅',
    toastRealError: 'Could not load real data', toastLiveOk: 'Live data loaded ✅',
    toastLiveError: 'Live data unavailable: try CSV import or bundled data',
    toastPartial: 'Partial close executed ✅',
    helpRealTitle: '5 · Real data + trailing stop + partial close',
    helpReal: 'Ten MIT-licensed real markets are bundled (NQ E-mini, NAS100USD, US30, SPX500, GER30, JPN225, EUR/USD, USD/JPY, XAU/USD, USOIL) and work offline, with optional live refresh and CSV import. Trailing tracks the extreme after R is reached; partial closes split a trade into independent journal rows so analytics stay exact, and rewind restores the size.',
    legalTitle: '6 · Licence & liability',
    legalText: 'Kyoraku Replay is original code licensed MIT OR Apache-2.0; bundled market data is MIT with attribution in ATTRIBUTION.md. Educational simulation only: not a broker, no real orders, no funds held, not financial advice. Live Yahoo data is subject to their terms; use a licensed feed for broad commercial distribution.',
    help: 'How it works',
    reset: 'New session', rewind: 'Rewind 20 bars', prev: 'Prev bar', play: '▶ Play', pause: '⏸ Pause', next: 'Next bar',
    speed: 'Speed', goTo: 'Go to date', go: 'Go', balance: 'Balance', equity: 'Equity', dd: 'Max DD', clock: 'Time (UTC)',
    lang: 'العربية',
    market: 'Market', symbol: 'Symbol', timeframe: 'Timeframe', htfChart: 'Higher timeframe', indicators: 'Indicators',
    volume: 'Volume', showTrades: 'Show trades', zoomHint: 'Wheel = zoom · Drag = pan',
    session: 'Session settings', startBalance: 'Starting balance', riskPct: 'Risk per trade %', spread: 'Spread (pips)',
    commission: 'Commission / lot', slPips: 'Stop (pips)', rr: 'Target (R)', autoBE: 'Auto break-even', beR: 'Trigger at (R)',
    propEnable: 'Prop firm rule simulation', target: 'Profit target %', dailyLimit: 'Max daily loss %', totalLimit: 'Max total DD %', minDays: 'Min trading days',
    saveSession: 'Save session', newSession: 'Start empty session', archived: 'Saved sessions', open: 'Open', del: 'Delete',
    order: 'Open a trade', buy: 'Buy / Long', sell: 'Sell / Short', customLevels: 'Custom price levels', slPrice: 'Stop price', tpPrice: 'Target price',
    pick: 'Pick from chart', computedSize: 'Computed size', riskAmount: 'Amount at risk', closeAll: 'Close all',
    positions: 'Open positions', close: 'Close', noPositions: 'No open positions', tagsLabel: 'Tags (comma separated)', notesLabel: 'Notes',
    tabJournal: 'Journal', tabAnalytics: 'Analytics', tabMonte: 'Monte Carlo', tabProp: 'Prop firm', tabData: 'Data',
    allSessions: 'All sessions', thisSession: 'This session only', filterSide: 'Side', filterResult: 'Result', all: 'All',
    winners: 'Winners', losers: 'Losers', tagFilter: 'Search tags/notes', exportCsv: 'Export CSV',
    colId: '#', colSymbol: 'Symbol', colSide: 'Side', colEntry: 'Entry', colExit: 'Exit', colPnl: 'P&L', colR: 'R', colReason: 'Reason', colNotes: 'Notes / tags', colAction: '',
    netPnl: 'Net P&L', winRate: 'Win rate', profitFactor: 'Profit factor', avgR: 'Average R', maxDDStat: 'Max drawdown', tradesCount: 'Trades',
    expectancy: 'Expectancy / trade', equityCurve: 'Equity curve', rDistribution: 'R distribution', hourlyPnl: 'P&L by hour (UTC)', weekdayPnl: 'P&L by weekday', calendar: 'P&L calendar', noData: 'No closed trades yet. Run the replay and open a trade to see analytics.',
    longShort: 'Long / Short', openNow: 'Open',
    mcTitle: 'Monte Carlo: what if you keep trading the same way?', mcNote: 'It reshuffles your own realized trade results. It is not a market forecast, only a projection of your behaviour.',
    mcTrades: 'Trades', mcRuns: 'Simulations', mcRun: 'Run simulation', mcP5: 'Bad case (5%)', mcMedian: 'Median outcome', mcP95: 'Good case (95%)', mcProfitable: 'Chance of profit', mcBust: 'Chance of breaking DD rule', mcFinal: 'Final outcome distribution',
    propStatus: 'Status', propActive: 'Running', propPassed: 'Passed ✅', propFailed: 'Failed ❌', propProgress: 'Progress to target', propViolations: 'Rule breaches', noViolations: 'No breaches so far 👍', tradingDays: 'Trading days', dailyUse: 'Daily loss used', totalUse: 'Total drawdown used',
    dataTitle: '100% free data', csvNote: 'Bring free OHLCV data from any source (MT4/MT5 export, Stooq, Yahoo, Dukascopy, Binance), or use the locally generated demo series. No network request is ever made by this app.',
    csvSymbol: 'Symbol id', csvPip: 'Pip size', csvContract: 'Contract value', csvDecimals: 'Price decimals', loadCsv: 'Load CSV file',
    exportJson: 'Export backup (JSON)', importJson: 'Import backup', exportPng: 'Chart PNG', clearAll: 'Clear all local data',
    localNote: 'Everything lives in your browser localStorage: no server, no account, no tracking, no limits.',
    freeSources: 'Suggested free data sources',
    helpTitle: 'How Kyoraku Replay works',
    help1Title: '1 · Bar-by-bar history replay',
    help1: 'The chart only draws candles at or before the replay cursor. The future is hidden, so practice feels real. Play advances one candle at a time, Go to jumps to any date, and Rewind rolls back and removes trades opened afterwards.',
    help2Title: '2 · Execution and risk',
    help2: 'Trades fill at the current candle close plus half the spread. You set stop and target, and position size is computed so the worst loss equals risk% × balance. Each new candle checks its high and low, with the stop checked before the target (conservative). Auto break-even, commission and slippage on gaps are included.',
    help3Title: '3 · Journal and analytics',
    help3: 'Every trade is logged automatically with its R multiple, tags and notes. You get an equity curve, win rate, profit factor, drawdown, hourly results, a P&L calendar, Monte Carlo resampling and prop-firm rules. There is no "Pro plan": every feature is unlocked.',
    help4Title: '4 · Why is it free?',
    help4: 'All the code is local (plain HTML/CSS/JS with no paid library), data is either deterministically generated or your own CSV, and storage is in the browser. There is no paid API, no account and no subscription. It even works offline.',
    helpClose: 'Got it ✅',
    toastNoFuture: 'End of data ✅', toastTrade: 'Trade opened ✅', toastBadLevels: 'Stop and target must be on the correct side', toastSaved: 'Session saved ✅', toastCsv: 'Data loaded ✅', toastCsvError: 'Could not read that file', toastStorage: 'Local storage is full: export a backup', toastReset: 'New session ✅', toastNeedTrades: 'You need at least 5 closed trades', toastJsonError: 'Invalid JSON file', toastCleared: 'Everything cleared ✅', toastExport: 'File exported ✅',
    reasonSl: 'Stop', reasonTp: 'Target', reasonManual: 'Manual', reasonGap: 'Gap', reasonSwitch: 'Market switch',
    reasonPartial: 'Partial', reasonAutoPartial: 'Auto partial',
    dayNames: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  };

  let current = 'ar';
  const dict = { ar: AR, en: EN };

  function set(lang) {
    current = lang === 'en' ? 'en' : 'ar';
    if (typeof document !== 'undefined') {
      document.documentElement.lang = current;
      document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
    }
    return current;
  }

  function t(key) {
    const d = dict[current];
    return Object.prototype.hasOwnProperty.call(d, key) ? d[key] : (AR[key] !== undefined ? AR[key] : key);
  }

  function apply(root) {
    if (typeof document === 'undefined') return;
    const scope = root || document;
    const nodes = scope.querySelectorAll('[data-i18n]');
    for (const el of nodes) el.textContent = t(el.getAttribute('data-i18n'));
    const ph = scope.querySelectorAll('[data-i18n-placeholder]');
    for (const el of ph) el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    const ti = scope.querySelectorAll('[data-i18n-title]');
    for (const el of ti) el.title = t(el.getAttribute('data-i18n-title'));
    const langOnly = scope.querySelectorAll('[data-lang-only]');
    for (const el of langOnly) el.style.display = el.getAttribute('data-lang-only') === current ? '' : 'none';
  }

  RL.i18n = { set, t, apply, get lang() { return current; } };
})(globalThis.RL = globalThis.RL || {});
