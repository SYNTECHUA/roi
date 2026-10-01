/*!
 * Creatio + SYNTECH ROI / TCO calculator
 * Методика: Total Economic Impact (Forrester TEI) — TCO, ризик-коригування, крива адаптації,
 * дисконтування грошових потоків (NPV, ROI, IRR, окупність), аналіз чутливості.
 * Прайс Creatio: https://www.creatio.com/products/pricing (дані калькулятора сайту, станом на 2026-10-01)
 * Прайс SYNTECH: https://syntech.digital/uk/products (станом на 2026-10-01)
 */
(function () {
    'use strict';

    // ==================== ПРАЙС-ДАНІ ====================
    // Число = ціна в USD (конвертується за курсом); об'єкт = офіційна ціна Creatio в кожній валюті.
    var PRICING = {
        updated: '01.10.2026',
        // Курси, якими Creatio сам перераховує прайс (ts_pricing.base.currency); UAH — курс НБУ (оновлюється онлайн)
        fx: { usd: 1, eur: 1, gbp: 0.8333333333, aud: 1.6, jpy: 180, uah: 44.8333 },
        fxDate: '02.10.2026',
        currencies: {
            uah: { label: 'UAH ₴', decimals: 0 },
            usd: { label: 'USD $', decimals: 2 },
            eur: { label: 'EUR €', decimals: 2 },
            gbp: { label: 'GBP £', decimals: 2 },
            aud: { label: 'AUD A$', decimals: 2 },
            jpy: { label: 'JPY ¥', decimals: 0 }
        },
        regions: {
            ua: {
                label: 'Україна',
                minPurchase: 10000,
                platform: { growth: 33.75, enterprise: 61.25 },
                product: 11.25,
                users: { limited: 12, mobile: 12, b2b: 12, ssp: 2 },
                contacts: [{ cost: 192, num: 0 }, { cost: 18, num: 24000 }, { cost: 5, num: 54000 }],
                emails: 0.18
            },
            global: {
                label: 'Глобальний',
                minPurchase: { usd: 10000, eur: 10000, gbp: 8300, aud: 16000, jpy: 1800000 },
                platform: {
                    growth: { usd: 40, eur: 40, gbp: 32, aud: 64, jpy: 7200 },
                    enterprise: { usd: 75, eur: 75, gbp: 61, aud: 120, jpy: 13500 }
                },
                product: { usd: 15, eur: 15, gbp: 12, aud: 24, jpy: 2700 },
                users: {
                    limited: { usd: 12, eur: 12, gbp: 10, aud: 20, jpy: 2160 },
                    mobile: { usd: 12, eur: 12, gbp: 10, aud: 20, jpy: 2160 },
                    b2b: { usd: 12, eur: 12, gbp: 10, aud: 20, jpy: 2160 },
                    ssp: { usd: 2, eur: 2, gbp: 2, aud: 3, jpy: 360 }
                },
                contacts: [{ cost: 215, num: 0 }, { cost: 20, num: 26750 }, { cost: 5, num: 60200 }],
                emails: 0.2
            }
        },
        // Спільні для регіонів позиції (USD або явні ціни у валютах)
        b2c: {
            '0': 0,
            '250': { usd: 5000, eur: 5000, gbp: 4250, aud: 8000, jpy: 900000 },
            '1000': { usd: 10000, eur: 10000, gbp: 8500, aud: 16000, jpy: 1800000 },
            '10000': { usd: 20000, eur: 20000, gbp: 17000, aud: 32000, jpy: 3600000 },
            '50000': { usd: 50000, eur: 50000, gbp: 42000, aud: 80000, jpy: 9000000 },
            '100000': { usd: 75000, eur: 75000, gbp: 62500, aud: 120000, jpy: 13500000 },
            '200000': { usd: 100000, eur: 100000, gbp: 83500, aud: 160000, jpy: 18000000 },
            '1000000': { usd: 150000, eur: 150000, gbp: 125000, aud: 240000, jpy: 27000000 }
        },
        ai: {
            none: { title: 'Без пакета', credits: 0, cost: 0, block: 0 },
            start: { title: 'Start', credits: 500000, cost: { usd: 5000, eur: 5000, gbp: 4178, aud: 8000, jpy: 900000 }, block: { usd: 5000, eur: 5000, gbp: 4178, aud: 8000, jpy: 900000 } },
            grow: { title: 'Grow', credits: 1500000, cost: { usd: 25000, eur: 25000, gbp: 20890, aud: 40000, jpy: 4500000 }, block: { usd: 4750, eur: 4750, gbp: 3970, aud: 7600, jpy: 855000 } },
            accelerate: { title: 'Accelerate', credits: 4000000, cost: { usd: 75000, eur: 75000, gbp: 62670, aud: 120000, jpy: 13500000 }, block: { usd: 4500, eur: 4500, gbp: 3760, aud: 7200, jpy: 810000 } },
            scale: { title: 'Scale', credits: 8000000, cost: { usd: 150000, eur: 150000, gbp: 125340, aud: 240000, jpy: 27000000 }, block: { usd: 4300, eur: 4300, gbp: 3590, aud: 6880, jpy: 774000 } },
            freedom: { title: 'Freedom (індивідуально)', credits: 0, cost: 0, block: 0, custom: true }
        },
        governance: 50,
        support: { basic: { title: 'AI Support', pct: 0 }, business: { title: 'Business Support', pct: 10 }, premium: { title: 'Premium Support', pct: 20 } },
        plans: {
            growth: { title: 'Growth', sub: 'Business & AI Studio', text: 'Для SMB: no-code, 50K кроків процесів/міс, 1 ГБ БД на користувача, 200 AI-кредитів/користувача', minUsers: 5, aiCredits: '200 AI-кредитів / користувача' },
            enterprise: { title: 'Enterprise', sub: 'Business & AI Studio', text: 'Масштабна автоматизація: необмежені процеси, 2 ГБ на користувача, SSO, 400 AI-кредитів/користувача', minUsers: 5, aiCredits: '400 AI-кредитів / користувача', badge: 'Популярний' },
            unlimited: { title: 'Unlimited', sub: 'Studio + усі CRM-продукти', text: 'Без лімітів користувачів: платформа, Sales, Marketing, Service та AI Studio — ціна за пропозицією', minUsers: 1, aiCredits: '10K AI-кредитів / організацію', custom: true }
        },
        // https://syntech.digital/uk/products — ціни в USD на рік
        syntech: [
            { group: 'Виробництво та ERP', items: [
                { id: 'mfg', title: 'Syntech Manufacturing', text: 'MES/MRP: Gantt-планування, наряди, облік виробітку', price: 600, perUser: true, minUsers: 10 },
                { id: 'fin', title: 'Фінансовий менеджмент', text: 'Бюджети, транзакції, баланси, P&L', price: 60, perUser: true },
                { id: 'bank', title: 'Імпорт банківських виписок', text: 'ПриватБанк, Monobank, ПУМБ', price: 600 }
            ] },
            { group: 'Проєкти та HR', items: [
                { id: 'pmstudio', title: 'Project Management Studio', text: 'Портфель, бюджети, Kanban/Gantt, AI-копілот (Enterprise)', price: 7200 },
                { id: 'pm', title: 'Syntech Project Management', text: 'Життєвий цикл проєкту, шаблони, чек-листи', price: 1200 },
                { id: 'portfolio', title: 'Portfolio Insights', text: 'Портфельна аналітика для керівників', price: 1200 },
                { id: 'hrm', title: 'Syntech HRM', text: 'Повний життєвий цикл співробітника, Work.ua', price: 1200 },
                { id: 'filecore', title: 'File Core', text: 'Google Drive, Docs, Sheets у Creatio', price: 2400 }
            ] },
            { group: 'Компоненти Freedom UI', items: [
                { id: 'pack', title: 'Пакет компонентів (9 шт.)', text: 'Gantt, Kanban, Hierarchy, Map, To Do, Pivot, Scheduler, Relation Diagram, Slider — економія 33%', price: 6420, bundle: ['gantt', 'kanban', 'hierarchy', 'map', 'todo', 'pivot', 'scheduler', 'relation', 'slider'] },
                { id: 'gantt', title: 'Gantt View', price: 1200 },
                { id: 'kanban', title: 'Kanban View', price: 1200 },
                { id: 'hierarchy', title: 'Hierarchy List View', price: 1200 },
                { id: 'map', title: 'Syntech Map', price: 1200 },
                { id: 'todo', title: 'To Do List', price: 1200 },
                { id: 'pivot', title: 'Pivot', price: 1200 },
                { id: 'scheduler', title: 'Scheduler', price: 1200 },
                { id: 'relation', title: 'Relation Diagram', price: 1200 },
                { id: 'slider', title: 'Slider', price: 144 },
                { id: 'tile', title: 'Tile View', price: 1200 },
                { id: 'whiteboard', title: 'Syntech Whiteboard', text: 'Необмежено користувачів і дошок', price: 6000 }
            ] },
            { group: 'Інтеграції та комунікації', items: [
                { id: 'lifecell', title: 'Lifecell Connector', text: 'SMS/Viber + тарифи Lifecell', price: 300 },
                { id: 'gms', title: 'GMS Connector', text: 'WhatsApp, SMS, Viber + тарифи GMS', price: 300 },
                { id: 'free', title: 'Безкоштовні додатки', text: 'Absence, Approval List, Excel Export Logger, Google Forms, Horoshop, Shop-Express, Screenshot Tool', price: 0 }
            ] }
        ]
    };

    var DAY_WEEKS = 46; // робочих тижнів на рік (без відпусток/свят)

    // ==================== СТАН ====================
    // Усі грошові поля стану зберігаються в USD і показуються у вибраній валюті.
    var state = {
        region: 'ua', currency: 'uah', plan: 'enterprise', users: 25, unlimitedAnnual: 0,
        products: {
            sales: { on: true, users: 15 },
            marketing: { on: false, users: 5, contacts: 5000, emails: 4 },
            service: { on: false, users: 5 }
        },
        extra: { limited: 0, mobile: 0, b2b: 0, ssp: 0, b2c: '0' },
        governance: false,
        ai: { pkg: 'none', blocks: 0 },
        support: 'basic',
        syntech: {},
        impl: { partner: 25000, internalHours: 400, trainingHours: 8, goLive: 4 },
        run: { adminFte: 0.25, partnerSupport: 6000, other: 0, uplift: 3 },
        labor: { salary: 1800, hoursYear: 1760 },
        ben: {
            sales: { on: true, sellers: 15, hours: 8, reduction: 30 },
            revenue: { on: true, opps: 80, winRate: 20, deal: 8000, uplift: 10, margin: 30 },
            retention: { on: true, base: 2000000, churn: 15, reduction: 2 },
            service: { on: false, cases: 1500, aht: 15, reduction: 20, deflection: 10 },
            automation: { on: true, hours: 120, share: 50 },
            legacy: { on: true, annual: 3000 }
        },
        fin: { horizon: 3, discount: 10, capture: 50, riskBen: 15, riskCost: 10, adoptY1: 70, adoptY2: 90 }
    };

    var root;

    // ==================== ДОПОМІЖНІ ====================
    function rate() { return PRICING.fx[state.currency] || 1; }
    // Ціна позиції у вибраній валюті
    function price(v) {
        if (v == null) return 0;
        if (typeof v === 'number') return v * rate();
        if (state.region === 'global' && v[state.currency] != null) return v[state.currency];
        return (v.usd || 0) * rate();
    }
    function region() { return PRICING.regions[state.region]; }
    function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, state); }
    function set(path, val) {
        var keys = path.split('.'), o = state;
        for (var i = 0; i < keys.length - 1; i++) o = o[keys[i]];
        o[keys[keys.length - 1]] = val;
    }
    function num(v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); }
    // Значення грошового поля у вибраній валюті (UAH/JPY — цілі, інші — до центів)
    function moneyInput(usd) {
        var k = Math.pow(10, PRICING.currencies[state.currency].decimals);
        return Math.round(num(usd) * rate() * k) / k;
    }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function fmt(amount, opts) {
        opts = opts || {};
        var cur = state.currency, c = PRICING.currencies[cur];
        var dec = opts.exact ? c.decimals : 0;
        if (opts.exact && Math.round(amount) === amount) dec = 0;
        try {
            return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: cur.toUpperCase(), minimumFractionDigits: dec, maximumFractionDigits: dec }).format(amount);
        } catch (e) { return Math.round(amount) + ' ' + cur.toUpperCase(); }
    }
    function fmtShort(amount) {
        var a = Math.abs(amount), s = amount < 0 ? '−' : '';
        var sym = { uah: '₴', usd: '$', eur: '€', gbp: '£', aud: 'A$', jpy: '¥' }[state.currency];
        if (a >= 1e9) return s + (a / 1e9).toFixed(1).replace('.', ',') + ' млрд ' + sym;
        if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace('.', ',') + ' млн ' + sym;
        if (a >= 1e4) return s + Math.round(a / 1e3) + ' тис ' + sym;
        return s + Math.round(a) + ' ' + sym;
    }
    function pct(v, d) { return isFinite(v) ? v.toFixed(d == null ? 0 : d).replace('.', ',') + '%' : '—'; }

    // ==================== РОЗРАХУНОК ВАРТОСТІ (TCO) ====================
    function computeCosts() {
        var r = region(), plan = state.plan, lines = [];
        var users = Math.max(PRICING.plans[plan].minUsers, Math.round(num(state.users)));
        function add(group, title, annual, note) { if (annual > 0 || note) lines.push({ group: group, title: title, annual: annual, note: note || '' }); }

        // Платформа
        if (plan === 'unlimited') {
            add('creatio', 'Creatio Unlimited (за пропозицією)', num(state.unlimitedAnnual) * rate(), state.unlimitedAnnual > 0 ? '' : 'вкажіть ціну з пропозиції Creatio');
        } else {
            add('creatio', 'Платформа ' + PRICING.plans[plan].title + ' × ' + users, price(r.platform[plan]) * users * 12);
        }

        // Продукти (в Unlimited включені)
        var productTitles = { sales: 'Sales', marketing: 'Marketing', service: 'Service' };
        Object.keys(productTitles).forEach(function (id) {
            var p = state.products[id];
            if (!p.on) return;
            var pu = Math.min(users, Math.max(1, Math.round(num(p.users))));
            if (plan !== 'unlimited') add('creatio', productTitles[id] + ' × ' + pu, price(r.product) * pu * 12);
            if (id === 'marketing') {
                var contacts = Math.max(1000, num(p.contacts));
                var contactsYear = Math.min.apply(null, r.contacts.map(function (t) { return contacts / 1000 * t.cost + t.num; })) * rate();
                add('creatio', 'Маркетингові контакти: ' + Math.round(contacts).toLocaleString('uk-UA'), contactsYear);
                var included = contacts * 5 * 12, sent = contacts * num(p.emails) * 12;
                var emailsYear = sent > included ? (sent - included) * r.emails * rate() / 1000 : 0;
                add('creatio', 'Email понад 5 листів/контакт/міс', emailsYear);
            }
        });

        // Додаткові типи користувачів (Enterprise / Unlimited)
        if (plan !== 'growth') {
            var e = state.extra;
            add('creatio', 'Limited internal × ' + e.limited, price(r.users.limited) * num(e.limited) * 12);
            add('creatio', 'Mobile-only × ' + e.mobile, price(r.users.mobile) * num(e.mobile) * 12);
            add('creatio', 'B2B-портал × ' + e.b2b, price(r.users.b2b) * num(e.b2b) * 12);
            if (state.products.service.on || plan === 'unlimited') add('creatio', 'Self-service портал × ' + e.ssp, price(r.users.ssp) * num(e.ssp));
            add('creatio', 'B2C-портал, пакет ' + (e.b2c === '1000000' ? 'Unlimited' : Number(e.b2c).toLocaleString('uk-UA')), price(PRICING.b2c[e.b2c]));
            if (state.governance) add('creatio', 'Governance Application × ' + users, price(PRICING.governance) * users * 12);
        }

        // AI-пакети
        var ai = PRICING.ai[state.ai.pkg];
        if (ai && !ai.custom && state.ai.pkg !== 'none') {
            add('creatio', 'AI-пакет ' + ai.title + ' (' + (ai.credits / 1e6).toString().replace('.', ',') + ' млн кредитів)', price(ai.cost));
            add('creatio', 'Додаткові блоки 500K AI-кредитів × ' + state.ai.blocks, price(ai.block) * num(state.ai.blocks));
        }

        var creatioSubtotal = lines.reduce(function (s, l) { return s + (l.group === 'creatio' ? l.annual : 0); }, 0);
        var supportPct = PRICING.support[state.support].pct;
        var supportCost = creatioSubtotal * supportPct / 100;
        if (supportCost > 0) add('creatio', PRICING.support[state.support].title + ' (' + supportPct + '%)', supportCost);

        var minPurchase = price(r.minPurchase);
        var creatioAnnual = creatioSubtotal + supportCost;
        var shortfall = 0;
        if (plan !== 'unlimited' && creatioAnnual > 0 && creatioAnnual < minPurchase) {
            shortfall = minPurchase - creatioAnnual;
            add('creatio', 'Доплата до мінімального контракту', shortfall);
            creatioAnnual = minPurchase;
        }

        // SYNTECH
        var bundled = {};
        PRICING.syntech.forEach(function (g) { g.items.forEach(function (it) { if (it.bundle && (state.syntech[it.id] || {}).on) it.bundle.forEach(function (b) { bundled[b] = true; }); }); });
        var syntechAnnual = 0;
        PRICING.syntech.forEach(function (g) {
            g.items.forEach(function (it) {
                var s = state.syntech[it.id];
                if (!s || !s.on || bundled[it.id]) return;
                var qty = it.perUser ? Math.max(it.minUsers || 1, Math.round(num(s.users))) : 1;
                var annual = it.price * qty * rate();
                syntechAnnual += annual;
                if (annual > 0) add('syntech', it.title + (it.perUser ? ' × ' + qty : ''), annual);
            });
        });

        return {
            lines: lines, users: users, creatioAnnual: creatioAnnual, syntechAnnual: syntechAnnual,
            licensesAnnual: creatioAnnual + syntechAnnual, minPurchase: minPurchase, shortfall: shortfall,
            supportCost: supportCost
        };
    }

    // ==================== ВИГОДИ ТА ФІНАНСОВА МОДЕЛЬ ====================
    function hourly() { return num(state.labor.salary) * rate() * 12 / Math.max(1, num(state.labor.hoursYear)); }

    function computeBenefits() {
        var b = state.ben, h = hourly(), capture = num(state.fin.capture) / 100, out = [];
        if (b.sales.on) out.push({ id: 'sales', title: 'Продуктивність продажів', hint: 'час на рутину, звітність, пошук даних', value: num(b.sales.sellers) * num(b.sales.hours) * DAY_WEEKS * num(b.sales.reduction) / 100 * h * capture });
        if (b.revenue.on) out.push({ id: 'revenue', title: 'Додатковий валовий прибуток', hint: 'зростання win rate × середній чек × маржа', value: num(b.revenue.opps) * 12 * num(b.revenue.winRate) / 100 * num(b.revenue.uplift) / 100 * num(b.revenue.deal) * rate() * num(b.revenue.margin) / 100 });
        if (b.retention.on) out.push({ id: 'retention', title: 'Утримання клієнтів', hint: 'зниження відтоку × база × маржа', value: num(b.retention.base) * rate() * Math.min(num(b.retention.reduction), num(b.retention.churn)) / 100 * num(b.revenue.margin) / 100 });
        if (b.service.on) {
            var defl = num(b.service.deflection) / 100, aht = num(b.service.aht);
            var minutes = num(b.service.cases) * 12 * (defl * aht + (1 - defl) * aht * num(b.service.reduction) / 100);
            out.push({ id: 'service', title: 'Ефективність сервісу', hint: 'AHT, самообслуговування, AI-агенти', value: minutes / 60 * h * capture });
        }
        if (b.automation.on) out.push({ id: 'automation', title: 'Автоматизація процесів', hint: 'погодження, звіти, введення даних', value: num(b.automation.hours) * 12 * num(b.automation.share) / 100 * h * capture });
        if (b.legacy.on) out.push({ id: 'legacy', title: 'Заміна legacy-систем', hint: 'ліцензії, хостинг, підтримка старих систем', value: num(b.legacy.annual) * rate() });
        return out;
    }

    function model(benefitFactor) {
        var c = computeCosts(), f = state.fin, h = hourly();
        var N = Math.max(1, Math.round(num(f.horizon, 3)));
        var riskCost = 1 + num(f.riskCost) / 100, riskBen = 1 - num(f.riskBen) / 100;
        var goLive = Math.min(12, Math.max(0, Math.round(num(state.impl.goLive))));
        var internalUsers = c.users + num(state.extra.limited) + num(state.extra.mobile);

        var benefits = computeBenefits();
        var fullBenefit = benefits.reduce(function (s, x) { return s + x.value; }, 0) * riskBen * (benefitFactor == null ? 1 : benefitFactor);

        // Початкові витрати (рік 0)
        var initPartner = num(state.impl.partner) * rate() * riskCost;
        var initInternal = num(state.impl.internalHours) * h * riskCost;
        var initTraining = num(state.impl.trainingHours) * internalUsers * h * riskCost;
        var initial = initPartner + initInternal + initTraining;

        var adoption = function (y) {
            if (y === 1) return num(f.adoptY1) / 100 * (12 - goLive) / 12;
            if (y === 2) return num(f.adoptY2) / 100;
            return 1;
        };
        var years = [];
        for (var y = 1; y <= N; y++) {
            var idx = Math.pow(1 + num(state.run.uplift) / 100, y - 1);
            var licenses = c.licensesAnnual * idx;
            var ops = (num(state.run.adminFte) * num(state.labor.salary) * 12 * rate() + (num(state.run.partnerSupport) + num(state.run.other)) * rate()) * riskCost;
            var cost = licenses + ops;
            var ben = fullBenefit * adoption(y);
            years.push({ y: y, licenses: licenses, ops: ops, cost: cost, benefit: ben, adoption: adoption(y), net: ben - cost });
        }

        var r = num(f.discount) / 100;
        var pvCost = initial, pvBen = 0, flows = [-initial];
        years.forEach(function (Y) {
            var d = Math.pow(1 + r, Y.y);
            pvCost += Y.cost / d; pvBen += Y.benefit / d; flows.push(Y.net);
        });
        var npv = pvBen - pvCost;
        var roi = pvCost > 0 ? npv / pvCost * 100 : 0;

        // Окупність: помісячний кумулятивний потік (недисконтований)
        var cum = -initial, payback = null, curve = [{ m: 0, v: cum }];
        for (var m = 1; m <= N * 12; m++) {
            var Y = years[Math.ceil(m / 12) - 1];
            var monthBen = (Y.y === 1 ? (m > goLive ? fullBenefit * num(f.adoptY1) / 100 / 12 : 0) : Y.benefit / 12);
            cum += monthBen - Y.cost / 12;
            curve.push({ m: m, v: cum });
            if (payback === null && cum >= 0) payback = m;
        }

        var totalCost = initial + years.reduce(function (s, Y) { return s + Y.cost; }, 0);
        var totalBen = years.reduce(function (s, Y) { return s + Y.benefit; }, 0);

        return {
            costs: c, benefits: benefits, riskBen: riskBen, fullBenefit: fullBenefit,
            initial: initial, initParts: { partner: initPartner, internal: initInternal, training: initTraining },
            years: years, pvCost: pvCost, pvBen: pvBen, npv: npv, roi: roi, irr: irr(flows),
            payback: payback, curve: curve, totalCost: totalCost, totalBen: totalBen, N: N, goLive: goLive,
            perUserMonth: c.users > 0 ? totalCost / N / 12 / (internalUsers || 1) : 0
        };
    }

    function irr(flows) {
        var npvAt = function (r) { return flows.reduce(function (s, f, i) { return s + f / Math.pow(1 + r, i); }, 0); };
        var lo = -0.99, hi = 10, fl = npvAt(lo), fh = npvAt(hi);
        if (!(fl * fh < 0)) return null;
        for (var i = 0; i < 200; i++) {
            var mid = (lo + hi) / 2, fm = npvAt(mid);
            if (Math.abs(fm) < 1e-6) return mid;
            if (fl * fm < 0) { hi = mid; fh = fm; } else { lo = mid; fl = fm; }
        }
        return (lo + hi) / 2;
    }

    // ==================== РЕНДЕР ФОРМИ ====================
    function field(label, path, o) {
        o = o || {};
        var v = get(path);
        if (o.money) v = moneyInput(v);
        var suffix = o.money ? { uah: '₴', usd: '$', eur: '€', gbp: '£', aud: 'A$', jpy: '¥' }[state.currency] : (o.suffix || '');
        return '<label class="rc-field' + (o.wide ? ' rc-wide' : '') + '"><span class="rc-field-label">' + label + '</span>' +
            '<span class="rc-input-wrap"><input type="number" inputmode="decimal" data-bind="' + path + '"' + (o.money ? ' data-money="1"' : '') +
            ' value="' + v + '" min="' + (o.min != null ? o.min : 0) + '"' + (o.max != null ? ' max="' + o.max + '"' : '') + ' step="' + (o.step || 'any') + '">' +
            (suffix ? '<span class="rc-suffix">' + suffix + '</span>' : '') + '</span>' +
            (o.hint ? '<span class="rc-hint">' + o.hint + '</span>' : '') + '</label>';
    }
    function toggle(path, label, extraClass) {
        return '<label class="rc-toggle ' + (extraClass || '') + '"><input type="checkbox" data-bind="' + path + '"' + (get(path) ? ' checked' : '') + '><span class="rc-switch"></span><span>' + label + '</span></label>';
    }
    function select(path, options, label) {
        var v = String(get(path));
        return '<label class="rc-field"><span class="rc-field-label">' + label + '</span><select data-bind="' + path + '">' +
            options.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
    }
    function unitPrice(v, unit) { return '<span class="rc-price">' + fmt(price(v), { exact: true }) + '</span><span class="rc-unit">' + unit + '</span>'; }

    function renderForm() {
        var r = region(), plan = state.plan;
        var html = '';

        // Toolbar
        html += '<div class="rc-toolbar">' +
            select('region', [['ua', 'Прайс Creatio: Україна'], ['global', 'Прайс Creatio: глобальний']], 'Регіон прайсу') +
            select('currency', Object.keys(PRICING.currencies).map(function (k) { return [k, PRICING.currencies[k].label]; }), 'Валюта') +
            select('fin.horizon', [[3, '3 роки (стандартний контракт)'], [5, '5 років']], 'Горизонт аналізу') +
            '<div class="rc-fx">Курс НБУ: 1 USD = <b id="rcFx">' + PRICING.fx.uah.toFixed(2).replace('.', ',') + ' ₴</b><br><span id="rcFxDate">на ' + PRICING.fxDate + '</span></div>' +
            '</div>';

        // 1. Платформа
        html += '<section class="rc-card"><h2><i>1</i>Платформа Creatio</h2><div class="rc-plans">' +
            ['growth', 'enterprise', 'unlimited'].map(function (id) {
                var p = PRICING.plans[id];
                return '<label class="rc-plan' + (plan === id ? ' is-on' : '') + '"><input type="radio" name="rcPlan" data-bind="plan" value="' + id + '"' + (plan === id ? ' checked' : '') + '>' +
                    (p.badge ? '<span class="rc-badge">' + p.badge + '</span>' : '') +
                    '<b class="rc-plan-title">' + p.title + '</b><span class="rc-plan-sub">' + p.sub + '</span>' +
                    '<div class="rc-plan-price">' + (p.custom ? '<span class="rc-price">За запитом</span>' : unitPrice(r.platform[id], '/користувач/міс')) + '</div>' +
                    '<span class="rc-plan-text">' + p.text + '</span></label>';
            }).join('') + '</div>' +
            '<div class="rc-grid">' +
            field('Користувачі платформи', 'users', { min: PRICING.plans[plan].minUsers, step: 1, hint: plan === 'unlimited' ? 'для розрахунку вигод і вартості на користувача' : 'мінімум 5 користувачів' }) +
            (plan === 'unlimited' ? field('Річна ціна Unlimited з пропозиції', 'unlimitedAnnual', { money: true, hint: 'Creatio визначає ціну індивідуально' }) : '') +
            '</div><p class="rc-note">Включено: ' + PRICING.plans[plan].aiCredits + '. Стандартний строк контракту — 3 роки, мінімальна сума для нових клієнтів — ' + fmt(price(r.minPurchase)) + '/рік. Ціни без ПДВ.</p></section>';

        // 2. CRM-продукти
        var prodNames = { sales: ['Sales', 'Агентна платформа продажів: ліди, угоди, прогнози, договори'], marketing: ['Marketing', 'Сегментація, омніканальні кампанії, lead-to-revenue'], service: ['Service', 'Звернення, SLA, черги, бази знань, омніканальність'] };
        html += '<section class="rc-card"><h2><i>2</i>CRM-продукти</h2>' + (plan === 'unlimited' ? '<p class="rc-note rc-ok">У тарифі Unlimited продукти Sales, Marketing і Service уже включені.</p>' : '') + '<div class="rc-list">' +
            Object.keys(prodNames).map(function (id) {
                var p = state.products[id];
                return '<div class="rc-item' + (p.on ? ' is-on' : '') + '">' +
                    '<div class="rc-item-head">' + toggle('products.' + id + '.on', '<b>' + prodNames[id][0] + '</b>') +
                    '<div class="rc-item-price">' + (plan === 'unlimited' ? '<span class="rc-price">Включено</span>' : unitPrice(r.product, '/користувач/міс')) + '</div></div>' +
                    '<p class="rc-item-text">' + prodNames[id][1] + '</p>' +
                    (p.on ? '<div class="rc-grid">' + field('Користувачі продукту', 'products.' + id + '.users', { min: 1, step: 1, hint: 'не більше користувачів платформи' }) +
                        (id === 'marketing' ? field('Маркетингові контакти', 'products.marketing.contacts', { min: 1000, step: 1000, hint: 'ступінчаста шкала Creatio' }) + field('Email на контакт / міс', 'products.marketing.emails', { min: 0, step: 1, hint: '5 листів/контакт/міс включено' }) : '') + '</div>' : '') +
                    '</div>';
            }).join('') + '</div></section>';

        // 3. Додаткові користувачі
        html += '<section class="rc-card"><h2><i>3</i>Додаткові типи користувачів і портали</h2>';
        if (plan === 'growth') {
            html += '<p class="rc-note rc-warn">Додаткові типи користувачів доступні лише в тарифах Enterprise та Unlimited.</p>';
        } else {
            html += '<div class="rc-grid">' +
                field('Limited internal · ' + fmt(price(r.users.limited), { exact: true }) + '/міс', 'extra.limited', { step: 1, hint: 'доступ до одного розділу' }) +
                field('Mobile-only · ' + fmt(price(r.users.mobile), { exact: true }) + '/міс', 'extra.mobile', { step: 1, hint: 'польові команди' }) +
                field('B2B-портал · ' + fmt(price(r.users.b2b), { exact: true }) + '/міс', 'extra.b2b', { step: 1, hint: 'партнери, підрядники' }) +
                ((state.products.service.on || plan === 'unlimited') ? field('Self-service портал · ' + fmt(price(r.users.ssp), { exact: true }) + '/рік', 'extra.ssp', { step: 1, hint: 'потрібен Service' }) : '') +
                select('extra.b2c', Object.keys(PRICING.b2c).map(function (k) { return [k, k === '0' ? 'Без B2C-порталу' : (k === '1000000' ? 'Unlimited' : Number(k).toLocaleString('uk-UA') + ' користувачів') + (k === '0' ? '' : ' — ' + fmt(price(PRICING.b2c[k])) + '/рік')]; }), 'B2C-портал (пакет)') +
                '</div>' + toggle('governance', 'Governance Application — ' + fmt(price(PRICING.governance)) + '/користувач/міс (аудит, комплаєнс)');
        }
        html += '</section>';

        // 4. AI та підтримка
        var ai = PRICING.ai[state.ai.pkg];
        html += '<section class="rc-card"><h2><i>4</i>AI-пакети та підтримка</h2><div class="rc-grid">' +
            select('ai.pkg', Object.keys(PRICING.ai).map(function (k) { var a = PRICING.ai[k]; return [k, a.title + (a.credits ? ' — ' + (a.credits / 1e6).toString().replace('.', ',') + ' млн кредитів, ' + fmt(price(a.cost)) + '/рік' : '')]; }), 'AI-пакет (річний)') +
            (ai && ai.block ? field('Додаткові блоки по 500K кредитів · ' + fmt(price(ai.block)) + '/рік', 'ai.blocks', { step: 1 }) : '') +
            select('support', Object.keys(PRICING.support).map(function (k) { var s = PRICING.support[k]; return [k, s.title + (s.pct ? ' — ' + s.pct + '% від підписки' : ' — включено')]; }), 'Рівень підтримки Creatio') +
            '</div>' + (ai && ai.custom ? '<p class="rc-note rc-warn">Пакет Freedom оцінюється індивідуально — зверніться до відділу продажів.</p>' : '') + '</section>';

        // 5. SYNTECH
        html += '<section class="rc-card"><h2><i>5</i>Рішення SYNTECH для Creatio</h2><p class="rc-note">Ліцензії на рік, на одне середовище (якщо не вказано «за користувача»). Пакет компонентів замінює окремі компоненти, що до нього входять.</p>';
        var bundleOn = (state.syntech.pack || {}).on;
        PRICING.syntech.forEach(function (g) {
            html += '<h3 class="rc-group">' + g.group + '</h3><div class="rc-list rc-list-compact">';
            g.items.forEach(function (it) {
                var s = state.syntech[it.id] || (state.syntech[it.id] = { on: false, users: it.minUsers || state.users });
                var inPack = bundleOn && PRICING.syntech[2].items[0].bundle.indexOf(it.id) >= 0;
                html += '<div class="rc-item' + (s.on && !inPack ? ' is-on' : '') + (inPack ? ' is-muted' : '') + '"><div class="rc-item-head">' +
                    toggle('syntech.' + it.id + '.on', '<b>' + it.title + '</b>') +
                    '<div class="rc-item-price">' + (inPack ? '<span class="rc-price">У пакеті</span>' : it.price === 0 ? '<span class="rc-price">Безкоштовно</span>' : unitPrice(it.price, it.perUser ? '/користувач/рік' : '/рік')) + '</div></div>' +
                    (it.text ? '<p class="rc-item-text">' + it.text + '</p>' : '') +
                    (s.on && it.perUser ? '<div class="rc-grid">' + field('Користувачі', 'syntech.' + it.id + '.users', { min: it.minUsers || 1, step: 1, hint: it.minUsers ? 'мінімум ' + it.minUsers : '' }) + '</div>' : '') +
                    '</div>';
            });
            html += '</div>';
        });
        html += '</section>';

        // 6. Впровадження та експлуатація
        html += '<section class="rc-card"><h2><i>6</i>Впровадження та експлуатація</h2>' +
            '<h3 class="rc-group">Вартість праці</h3><div class="rc-grid">' +
            field('Повна вартість співробітника / міс', 'labor.salary', { money: true, hint: 'зарплата + податки (ЄСВ) + накладні' }) +
            field('Робочих годин на рік', 'labor.hoursYear', { step: 10, hint: '≈1 760 год' }) +
            '</div><h3 class="rc-group">Одноразові витрати (рік 0)</h3><div class="rc-grid">' +
            field('Послуги партнера з впровадження', 'impl.partner', { money: true, hint: 'аналіз, налаштування, інтеграції, міграція даних' }) +
            field('Години внутрішньої команди', 'impl.internalHours', { step: 10, hint: 'ключові користувачі, ІТ, керівник проєкту' }) +
            field('Навчання, год на користувача', 'impl.trainingHours', { step: 1 }) +
            field('Тривалість впровадження, міс', 'impl.goLive', { min: 0, max: 12, step: 1, hint: 'вигоди починаються після запуску' }) +
            '</div><h3 class="rc-group">Щорічні витрати</h3><div class="rc-grid">' +
            field('Адміністратор системи, FTE', 'run.adminFte', { step: 0.05, hint: '0,25 = чверть ставки' }) +
            field('Супровід і розвиток партнером / рік', 'run.partnerSupport', { money: true }) +
            field('Інші витрати / рік', 'run.other', { money: true, hint: 'інтеграції, телефонія, SMS-тарифи' }) +
            field('Щорічна індексація ліцензій', 'run.uplift', { suffix: '%', step: 0.5 }) +
            '</div></section>';

        // 7. Вигоди
        var b = state.ben;
        html += '<section class="rc-card"><h2><i>7</i>Бізнес-ефекти</h2><p class="rc-note">Вмикайте лише ті ефекти, які можна підтвердити даними компанії. Значення за замовчуванням — консервативні галузеві орієнтири.</p>' +
            benefitBlock('sales', 'Продуктивність продажів', field('Менеджерів з продажу', 'ben.sales.sellers', { step: 1 }) + field('Годин рутини на тиждень', 'ben.sales.hours', { step: 0.5, hint: 'звіти, введення даних, пошук інформації' }) + field('Скорочення рутини', 'ben.sales.reduction', { suffix: '%', max: 100, hint: 'типово 20–40%' })) +
            benefitBlock('revenue', 'Зростання виручки (win rate)', field('Нових угод (opportunities) / міс', 'ben.revenue.opps', { step: 1 }) + field('Поточний win rate', 'ben.revenue.winRate', { suffix: '%', max: 100 }) + field('Середній чек', 'ben.revenue.deal', { money: true }) + field('Відносне зростання win rate', 'ben.revenue.uplift', { suffix: '%', hint: 'типово 5–15%: 20% → 22% = +10%' }) + field('Валова маржа', 'ben.revenue.margin', { suffix: '%', max: 100, hint: 'вигода = прибуток, а не виручка' })) +
            benefitBlock('retention', 'Утримання клієнтів', field('Річна виручка від наявних клієнтів', 'ben.retention.base', { money: true }) + field('Поточний відтік', 'ben.retention.churn', { suffix: '%', max: 100 }) + field('Зниження відтоку, п.п.', 'ben.retention.reduction', { step: 0.5, hint: 'маржа — з блоку виручки' })) +
            benefitBlock('service', 'Ефективність сервісу', field('Звернень / міс', 'ben.service.cases', { step: 10 }) + field('Середній час обробки, хв', 'ben.service.aht', { step: 1 }) + field('Скорочення часу обробки', 'ben.service.reduction', { suffix: '%', max: 100, hint: 'типово 15–30%' }) + field('Самообслуговування / AI-агенти', 'ben.service.deflection', { suffix: '%', max: 100, hint: 'частка звернень без оператора' })) +
            benefitBlock('automation', 'Автоматизація процесів', field('Годин ручної роботи / міс', 'ben.automation.hours', { step: 10, hint: 'погодження, звіти, перенесення даних' }) + field('Частка, що автоматизується', 'ben.automation.share', { suffix: '%', max: 100 })) +
            benefitBlock('legacy', 'Заміна legacy-систем', field('Витрати на старі системи / рік', 'ben.legacy.annual', { money: true, hint: 'ліцензії, хостинг, підтримка, Excel-обвʼязка' })) +
            '</section>';

        // 8. Фінансові параметри
        html += '<section class="rc-card"><h2><i>8</i>Параметри методики</h2><div class="rc-grid">' +
            field('Ставка дисконтування', 'fin.discount', { suffix: '%', step: 0.5, hint: 'WACC компанії; TEI типово 10%' }) +
            field('Монетизація зекономленого часу', 'fin.capture', { suffix: '%', max: 100, hint: 'частка часу, що стає продуктивною роботою (TEI ~50%)' }) +
            field('Ризик-коригування вигод', 'fin.riskBen', { suffix: '%', max: 90, hint: 'зменшує вигоди на невизначеність' }) +
            field('Ризик-коригування витрат', 'fin.riskCost', { suffix: '%', hint: 'резерв на перевищення бюджету' }) +
            field('Адаптація в 1-й рік', 'fin.adoptY1', { suffix: '%', max: 100, hint: 'після запуску' }) +
            field('Адаптація в 2-й рік', 'fin.adoptY2', { suffix: '%', max: 100, hint: 'з 3-го року — 100%' }) +
            '</div></section>';

        root.querySelector('#rcForm').innerHTML = html;
    }

    function benefitBlock(id, title, fields) {
        var on = state.ben[id].on;
        return '<div class="rc-benefit' + (on ? ' is-on' : '') + '">' + toggle('ben.' + id + '.on', '<b>' + title + '</b>') +
            (on ? '<div class="rc-grid">' + fields + '</div>' : '') + '</div>';
    }

    // ==================== РЕНДЕР РЕЗУЛЬТАТІВ ====================
    function renderResults() {
        var M = model();
        var el = root.querySelector('#rcResults');
        var verdict = M.npv > 0 && M.roi >= 50 ? 'good' : M.npv > 0 ? 'mid' : 'bad';
        var paybackText = M.payback === null ? '> ' + M.N * 12 + ' міс' : M.payback + ' міс';

        var html = '<div class="rc-kpis">' +
            kpi('ROI за ' + M.N + (M.N === 5 ? ' років' : ' роки'), pct(M.roi), 'ризик-скоригований, PV', M.roi >= 0 ? 'pos' : 'neg') +
            kpi('NPV', fmtShort(M.npv), 'чиста приведена вартість', M.npv >= 0 ? 'pos' : 'neg') +
            kpi('Окупність', paybackText, 'від підписання контракту', M.payback !== null && M.payback <= 24 ? 'pos' : (M.payback === null ? 'neg' : 'warn')) +
            kpi('IRR', M.irr === null ? '—' : pct(M.irr * 100), 'внутрішня норма дохідності', M.irr !== null && M.irr * 100 > num(state.fin.discount) ? 'pos' : 'neg') +
            '</div>';

        html += '<div class="rc-verdict rc-' + verdict + '">' + verdictText(M) + '</div>';

        // Графік кумулятивного грошового потоку
        html += '<div class="rc-panel"><h3>Кумулятивний грошовий потік</h3>' + chart(M) + '</div>';

        // Таблиця TEI
        html += '<div class="rc-panel"><h3>Грошові потоки (ризик-скориговані)</h3><div class="rc-table-wrap"><table class="rc-table"><thead><tr><th></th><th>Рік 0</th>' +
            M.years.map(function (Y) { return '<th>Рік ' + Y.y + '</th>'; }).join('') + '<th>Разом</th><th>PV</th></tr></thead><tbody>';
        var pvLic = 0, pvOps = 0, pvB = 0, r = num(state.fin.discount) / 100;
        M.years.forEach(function (Y) { var d = Math.pow(1 + r, Y.y); pvLic += Y.licenses / d; pvOps += Y.ops / d; pvB += Y.benefit / d; });
        html += row('Ліцензії', 0, M.years.map(function (Y) { return Y.licenses; }), pvLic, 'neg');
        html += row('Впровадження й навчання', M.initial, M.years.map(function () { return 0; }), M.initial, 'neg');
        html += row('Експлуатація', 0, M.years.map(function (Y) { return Y.ops; }), pvOps, 'neg');
        html += row('<b>Усього витрат</b>', M.initial, M.years.map(function (Y) { return Y.cost; }), M.pvCost, 'neg strong');
        html += row('<b>Вигоди</b>', 0, M.years.map(function (Y) { return Y.benefit; }), pvB, 'pos strong');
        html += row('<b>Чистий потік</b>', -M.initial, M.years.map(function (Y) { return Y.net; }), M.npv, 'net strong');
        html += '<tr class="rc-muted"><td>Рівень адаптації</td><td>—</td>' + M.years.map(function (Y) { return '<td>' + pct(Y.adoption * 100) + '</td>'; }).join('') + '<td></td><td></td></tr>';
        html += '</tbody></table></div></div>';

        // Вигоди
        var maxB = Math.max.apply(null, M.benefits.map(function (x) { return x.value; }).concat([1]));
        html += '<div class="rc-panel"><h3>Вигоди на рік при повній адаптації</h3>';
        if (!M.benefits.length) html += '<p class="rc-note">Увімкніть хоча б один бізнес-ефект у розділі 7.</p>';
        M.benefits.forEach(function (x) {
            var v = x.value * M.riskBen;
            html += '<div class="rc-bar"><div class="rc-bar-label"><span>' + x.title + '<small>' + x.hint + '</small></span><b>' + fmt(v) + '</b></div><div class="rc-bar-track"><div class="rc-bar-fill" style="width:' + (x.value / maxB * 100).toFixed(1) + '%"></div></div></div>';
        });
        if (M.benefits.length) html += '<div class="rc-sum"><span>Разом (після ризик-коригування −' + state.fin.riskBen + '%)</span><b>' + fmt(M.fullBenefit) + '</b></div>';
        html += '</div>';

        // Специфікація ліцензій
        var c = M.costs;
        html += '<div class="rc-panel"><h3>Ліцензії на рік</h3><table class="rc-spec">' +
            c.lines.map(function (l) { return '<tr class="rc-' + l.group + '"><td>' + esc(l.title) + (l.note ? '<small>' + l.note + '</small>' : '') + '</td><td>' + fmt(l.annual) + '</td></tr>'; }).join('') +
            '<tr class="rc-total"><td>Creatio</td><td>' + fmt(c.creatioAnnual) + '</td></tr>' +
            (c.syntechAnnual ? '<tr class="rc-total"><td>SYNTECH</td><td>' + fmt(c.syntechAnnual) + '</td></tr>' : '') +
            '<tr class="rc-total rc-grand"><td>Усього на рік / на місяць</td><td>' + fmt(c.licensesAnnual) + '<small>' + fmt(c.licensesAnnual / 12) + ' / міс</small></td></tr></table>' +
            (c.shortfall > 0 ? '<p class="rc-note rc-warn">Мінімальна річна сума для нових клієнтів Creatio — ' + fmt(c.minPurchase) + '. Різницю додано як доплату.</p>' : '') +
            '<div class="rc-mini"><div><span>TCO за ' + M.N + ' р.</span><b>' + fmtShort(M.totalCost) + '</b></div><div><span>Вигоди за ' + M.N + ' р.</span><b>' + fmtShort(M.totalBen) + '</b></div><div><span>TCO на користувача / міс</span><b>' + fmt(M.perUserMonth) + '</b></div></div></div>';

        // Чутливість
        html += '<div class="rc-panel"><h3>Аналіз чутливості</h3><p class="rc-note">Що буде, якщо фактичні вигоди відрізнятимуться від прогнозу.</p><table class="rc-table rc-sens"><thead><tr><th>Реалізація вигод</th><th>ROI</th><th>NPV</th><th>Окупність</th></tr></thead><tbody>' +
            [0.5, 0.75, 1, 1.25].map(function (k) {
                var S = model(k);
                return '<tr' + (k === 1 ? ' class="rc-base"' : '') + '><td>' + Math.round(k * 100) + '%' + (k === 1 ? ' (базовий)' : '') + '</td><td class="' + (S.roi >= 0 ? 'pos' : 'neg') + '">' + pct(S.roi) + '</td><td class="' + (S.npv >= 0 ? 'pos' : 'neg') + '">' + fmtShort(S.npv) + '</td><td>' + (S.payback === null ? '> ' + S.N * 12 + ' міс' : S.payback + ' міс') + '</td></tr>';
            }).join('') + '</tbody></table></div>';

        html += '<div class="rc-actions"><button type="button" class="rc-btn" data-action="print">Зберегти PDF / друк</button><button type="button" class="rc-btn rc-btn-ghost" data-action="reset">Скинути</button></div>';

        el.innerHTML = html;
    }

    function kpi(label, value, sub, cls) { return '<div class="rc-kpi rc-' + cls + '"><span>' + label + '</span><b>' + value + '</b><small>' + sub + '</small></div>'; }
    function row(label, y0, ys, pv, cls) {
        var sign = cls.indexOf('neg') >= 0 ? -1 : 1, total = y0 + ys.reduce(function (s, v) { return s + v; }, 0);
        var cell = function (v) { var x = v * sign; return '<td class="' + (x < 0 ? 'neg' : x > 0 ? 'pos' : '') + '">' + (v === 0 ? '—' : fmtShort(x)) + '</td>'; };
        return '<tr class="' + cls + '"><td>' + label + '</td>' + cell(y0) + ys.map(cell).join('') + cell(total) + cell(pv) + '</tr>';
    }

    function verdictText(M) {
        var pb = M.payback === null ? 'не окупається за ' + M.N * 12 + ' міс' : 'окупається за ' + M.payback + ' міс';
        if (M.npv > 0 && M.roi >= 50) return '<b>Інвестиція економічно обґрунтована.</b> На кожну вкладену одиницю — ' + (1 + M.roi / 100).toFixed(2).replace('.', ',') + ' одиниці приведених вигод; проєкт ' + pb + '. Найбільший внесок — «' + topBenefit(M) + '».';
        if (M.npv > 0) return '<b>Помірно привабливо.</b> NPV позитивний, проєкт ' + pb + '. Посильте ефект: розширте охоплення процесів або скоротіть ліцензії до реальних ролей.';
        return '<b>За поточних припущень інвестиція не окупається.</b> Проєкт ' + pb + '. Перевірте обсяг вигод, кількість ліцензій (Limited / Mobile-only замість повних) та бюджет впровадження.';
    }
    function topBenefit(M) { var t = M.benefits.slice().sort(function (a, b) { return b.value - a.value; })[0]; return t ? t.title : '—'; }

    function chart(M) {
        var W = 640, H = 220, P = { l: 56, r: 12, t: 14, b: 26 };
        var pts = M.curve, n = pts.length - 1;
        var vals = pts.map(function (p) { return p.v; });
        var min = Math.min(0, Math.min.apply(null, vals)), max = Math.max(0, Math.max.apply(null, vals));
        if (max === min) max = min + 1;
        var x = function (m) { return P.l + (W - P.l - P.r) * m / n; };
        var y = function (v) { return P.t + (H - P.t - P.b) * (max - v) / (max - min); };
        var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(p.m).toFixed(1) + ' ' + y(p.v).toFixed(1); }).join(' ');
        var area = line + ' L' + x(n) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z';
        var svg = '<svg class="rc-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Кумулятивний грошовий потік по місяцях">' +
            '<defs><linearGradient id="rcArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--rc-accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--rc-accent)" stop-opacity="0"/></linearGradient></defs>';
        [max, (max + min) / 2, min].forEach(function (v) { svg += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="rc-grid-line"/><text x="' + (P.l - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" class="rc-axis">' + fmtShort(v) + '</text>'; });
        for (var yr = 1; yr <= M.N; yr++) svg += '<line x1="' + x(yr * 12) + '" x2="' + x(yr * 12) + '" y1="' + P.t + '" y2="' + (H - P.b) + '" class="rc-grid-line"/><text x="' + x(yr * 12 - 6) + '" y="' + (H - 8) + '" text-anchor="middle" class="rc-axis">Рік ' + yr + '</text>';
        svg += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(0) + '" y2="' + y(0) + '" class="rc-zero"/>';
        svg += '<path d="' + area + '" fill="url(#rcArea)"/><path d="' + line + '" class="rc-line"/>';
        if (M.payback !== null) svg += '<circle cx="' + x(M.payback) + '" cy="' + y(0) + '" r="5" class="rc-dot"/><text x="' + x(M.payback) + '" y="' + (y(0) - 10) + '" text-anchor="middle" class="rc-dot-label">окупність · ' + M.payback + ' міс</text>';
        return svg + '</svg>';
    }

    // ==================== МЕТОДИКА ====================
    function methodology() {
        return '<details class="rc-method"><summary>Методика розрахунку та джерела</summary><div class="rc-method-body">' +
            '<p>Модель побудована за підходом <b>Total Economic Impact (TEI)</b>, який Forrester використовує для оцінки ІТ-інвестицій, і доповнена класичним розрахунком <b>TCO</b>.</p>' +
            '<ol>' +
            '<li><b>Витрати (TCO).</b> Рік 0 — послуги партнера, години внутрішньої команди та навчання. Роки 1…N — ліцензії Creatio та SYNTECH з річною індексацією, адміністрування (FTE × вартість співробітника), супровід та інші витрати. Внутрішні витрати збільшуються на ризик-коригування витрат.</li>' +
            '<li><b>Вигоди</b> рахуються за категоріями. Зекономлений час монетизується як <i>години × погодинна вартість × частка монетизації</i>: не весь вивільнений час стає продуктивним. Зростання виручки враховується за <i>валовою маржею</i>, а не за оборотом.</li>' +
            '<li><b>Ризик-коригування.</b> Вигоди зменшуються на заданий відсоток невизначеності, витрати — збільшуються.</li>' +
            '<li><b>Крива адаптації.</b> Вигоди з’являються лише після запуску; у 1-й рік — частка від повного ефекту, з 3-го року — 100%.</li>' +
            '<li><b>Фінансові показники.</b> PV = Σ CFₜ / (1 + r)ᵗ; NPV = PV вигод − PV витрат; ROI = NPV / PV витрат; IRR — ставка, за якої NPV = 0; окупність — перший місяць, коли кумулятивний недисконтований потік ≥ 0.</li>' +
            '<li><b>Чутливість</b> — перерахунок за реалізації 50–125% очікуваних вигод.</li>' +
            '</ol>' +
            '<p><b>Прайс Creatio</b> взято з калькулятора <a href="https://www.creatio.com/products/pricing" target="_blank" rel="noopener">creatio.com/products/pricing</a> (станом на ' + PRICING.updated + '): глобальні ціни в USD, EUR, GBP, AUD, JPY та окремий прайс для України (USD). Для валют без офіційного прайсу ціни перераховуються з USD за курсами, які використовує Creatio; гривня — за курсом НБУ. Ціни — за умови річної оплати, без ПДВ; Unlimited і Freedom — за індивідуальною пропозицією. Мінімальна сума для нових клієнтів — еквівалент $10 000/рік, стандартний строк — 3 роки.</p>' +
            '<p><b>Прайс SYNTECH</b> — <a href="https://syntech.digital/uk/products" target="_blank" rel="noopener">syntech.digital/uk/products</a> (станом на ' + PRICING.updated + '). Ціни в USD на рік; комісії операторів SMS/Viber і Google Workspace оплачуються окремо.</p>' +
            '<p class="rc-note">Результат — оцінка для бізнес-кейсу, а не комерційна пропозиція. Точну вартість підтвердить SYNTECH — офіційний партнер Creatio.</p>' +
            '</div></details>';
    }

    // ==================== ПОДІЇ ====================
    function onInput(e) {
        var t = e.target, path = t.getAttribute('data-bind');
        if (!path) return;
        var structural = /^(region|currency|plan|products\.\w+\.on|syntech\.\w+\.on|ben\.\w+\.on|ai\.pkg|governance|fin\.horizon)$/.test(path);
        if (t.type === 'checkbox') set(path, t.checked);
        else if (t.type === 'radio') { if (t.checked) set(path, t.value); }
        else if (t.tagName === 'SELECT') set(path, /^fin\.horizon$/.test(path) ? Number(t.value) : t.value);
        else {
            if (e.type === 'input' && t.value === '') return;
            var v = num(t.value);
            if (t.max !== '' && v > num(t.max)) v = num(t.max);
            if (v < 0) v = 0;
            set(path, t.hasAttribute('data-money') ? v / rate() : v);
        }
        applyRules(path);
        if (structural) renderForm();
        else if (e.type === 'change') syncInputs();
        renderResults();
    }

    // Оновити значення полів, які могли змінитися через правила ліцензування (без перерендеру форми)
    function syncInputs() {
        Array.prototype.forEach.call(root.querySelectorAll('#rcForm input[type=number]'), function (inp) {
            if (inp === document.activeElement) return;
            var v = num(get(inp.getAttribute('data-bind')));
            if (inp.hasAttribute('data-money')) v = moneyInput(v);
            if (num(inp.value) !== v) inp.value = v;
        });
    }

    // Узгодження правил ліцензування Creatio
    function applyRules(path) {
        var minU = PRICING.plans[state.plan].minUsers;
        if (state.users < minU) state.users = minU;
        // Кількість користувачів продукту не може перевищувати кількість користувачів платформи
        ['sales', 'marketing', 'service'].forEach(function (id) {
            var p = state.products[id];
            if (p.users > state.users) {
                if (path === 'products.' + id + '.users') state.users = Math.round(p.users);
                else p.users = state.users;
            }
        });
        if (path === 'region' && state.region === 'ua' && state.currency !== 'uah' && state.currency !== 'usd') state.currency = 'uah';
        if (path === 'region' && state.region === 'global' && state.currency === 'uah') state.currency = 'usd';
        if (path === 'products.sales.users' && state.ben.sales.sellers > state.users) state.ben.sales.sellers = state.products.sales.users;
    }

    function onClick(e) {
        var a = e.target.closest('[data-action]');
        if (!a) return;
        if (a.getAttribute('data-action') === 'print') window.print();
        if (a.getAttribute('data-action') === 'reset') { state = JSON.parse(DEFAULTS); renderForm(); renderResults(); }
    }

    function loadNbuRate() {
        if (!window.fetch) return;
        fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d || !d[0] || !(d[0].rate > 0)) return;
                PRICING.fx.uah = d[0].rate; PRICING.fxDate = d[0].exchangedate;
                var fx = root.querySelector('#rcFx'), dt = root.querySelector('#rcFxDate');
                if (fx) fx.textContent = d[0].rate.toFixed(2).replace('.', ',') + ' ₴';
                if (dt) dt.textContent = 'на ' + d[0].exchangedate;
                if (state.currency === 'uah') { renderForm(); renderResults(); }
            })
            .catch(function () { /* залишається вбудований курс */ });
    }

    var DEFAULTS;
    function init() {
        root = document.querySelector('.roi-calculator');
        if (!root) return;
        DEFAULTS = JSON.stringify(state);
        root.innerHTML = '<div class="rc-container">' +
            '<header class="rc-header"><span class="rc-eyebrow">SYNTECH · офіційний партнер Creatio</span><h1>Калькулятор ROI для Creatio</h1>' +
            '<p>Повна вартість володіння, ризик-скориговані вигоди, NPV, IRR і термін окупності — за методикою Total Economic Impact. Актуальний прайс Creatio та рішень SYNTECH.</p></header>' +
            '<div class="rc-layout"><div class="rc-form" id="rcForm"></div><aside class="rc-results"><div class="rc-sticky" id="rcResults"></div></aside></div>' +
            methodology() +
            '<footer class="rc-footer">Ціни оновлено ' + PRICING.updated + ' · <a href="https://www.creatio.com/products/pricing" target="_blank" rel="noopener">Creatio pricing</a> · <a href="https://syntech.digital/uk/products" target="_blank" rel="noopener">SYNTECH products</a></footer>' +
            '</div>';
        root.addEventListener('input', onInput);
        root.addEventListener('change', onInput);
        root.addEventListener('click', onClick);
        renderForm();
        renderResults();
        loadNbuRate();
    }

    // Для тестів
    window.CreatioRoiCalculator = { state: function () { return state; }, model: model, PRICING: PRICING };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
