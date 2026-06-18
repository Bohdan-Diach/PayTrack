// ================= БАЗА ДАНИХ ТА НАЛАШТУВАННЯ =================
let transactions = JSON.parse(localStorage.getItem('fb_bento_data')) || [];
let userGoal = JSON.parse(localStorage.getItem('fb_goal_data')) || null;
let userLimits = JSON.parse(localStorage.getItem('fb_limits_data')) || {};
let userProfile = JSON.parse(localStorage.getItem('fb_user_profile')) || { name: 'Користувач', email: 'finance@buddy.ua', currency: '₴', theme: 'light', criticMode: false };

const CURRENCY = userProfile.currency || '₴';
let currentChart = null; 

if (userProfile.theme === 'dark') document.documentElement.classList.add('dark');
else document.documentElement.classList.remove('dark');

// ================= КАТЕГОРІЇ =================
const categoryConfig = {
    'income': { name: 'Дохід', icon: 'fa-arrow-down', emoji: '💰', color: 'text-emerald-500', bg: 'bg-emerald-100', type: 'income' },
    'salary': { name: 'Зарплата', icon: 'fa-wallet', emoji: '💵', color: 'text-emerald-500', bg: 'bg-emerald-100', type: 'income' },
    'freelance': { name: 'Фріланс', icon: 'fa-laptop-code', emoji: '💻', color: 'text-teal-500', bg: 'bg-teal-100', type: 'income' },
    'gifts': { name: 'Подарунки', icon: 'fa-gift', emoji: '🎁', color: 'text-yellow-500', bg: 'bg-yellow-100', type: 'income' },
    'cashback': { name: 'Кешбек', icon: 'fa-coins', emoji: '🪙', color: 'text-green-500', bg: 'bg-green-100', type: 'income' },
    'products': { name: 'Продукти', icon: 'fa-shopping-cart', emoji: '🛒', color: 'text-blue-500', bg: 'bg-blue-100', type: 'expense' },
    'transport': { name: 'Транспорт', icon: 'fa-car', emoji: '🚗', color: 'text-rose-500', bg: 'bg-rose-100', type: 'expense' },
    'utilities': { name: 'Ком. послуги', icon: 'fa-bolt', emoji: '💡', color: 'text-amber-500', bg: 'bg-amber-100', type: 'expense' },
    'clothing': { name: 'Одяг', icon: 'fa-tshirt', emoji: '👕', color: 'text-pink-500', bg: 'bg-pink-100', type: 'expense' },
    'entertainment': { name: 'Розваги', icon: 'fa-film', emoji: '🎬', color: 'text-purple-500', bg: 'bg-purple-100', type: 'expense' },
    'shopping': { name: 'Покупки', icon: 'fa-shopping-bag', emoji: '🛍️', color: 'text-indigo-500', bg: 'bg-indigo-100', type: 'expense' },
    'other': { name: 'Інше', icon: 'fa-box', emoji: '📦', color: 'text-slate-500', bg: 'bg-slate-100', type: 'expense' }
};

if (typeof Chart !== 'undefined') Chart.register(ChartDataLabels);

function formatMoney(amount) { return Math.floor(amount).toLocaleString('uk-UA'); }

// ================= МАРШРУТИЗАТОР =================
document.addEventListener('DOMContentLoaded', () => {
    updateSidebarProfile();
    updateMobileNavigation();
    updateDesktopNavigation();
    
    const amountInputs = document.querySelectorAll('input[placeholder^="Сума"]');
    amountInputs.forEach(input => input.placeholder = `Сума (${CURRENCY})`);

    if (document.getElementById('transaction-form')) initDashboard();
    if (document.getElementById('analyticsChart')) initStatistics();
    if (document.getElementById('full-history-list')) initHistory();
    if (document.getElementById('limits-list')) initLimits();
    if (document.getElementById('profile-form')) initSettings();
});

function updateDesktopNavigation() {
    const page = window.location.pathname.split("/").pop() || "index.html"; 
    const desktopNav = document.querySelector('aside.sidebar nav');
    if (!desktopNav) return;
    desktopNav.querySelectorAll('a').forEach(link => {
        if (link.getAttribute('href') === page) link.className = "flex items-center gap-4 bg-green-brand text-white px-5 py-3 rounded-2xl font-medium shadow-lg";
        else link.className = "flex items-center gap-4 px-5 py-3 rounded-2xl font-medium text-slate-500 hover:bg-slate-100 transition-colors dark:hover:bg-slate-800";
    });
}

function updateMobileNavigation() {
    const page = window.location.pathname.split("/").pop() || "index.html"; 
    const mobileNav = document.querySelector('nav.fixed.bottom-0');
    if (!mobileNav) return;
    mobileNav.querySelectorAll('a').forEach(link => {
        if (link.getAttribute('href') === page) link.className = "flex flex-col items-center p-2 text-emerald-600";
        else link.className = "flex flex-col items-center p-2 text-slate-400 hover:text-emerald-500 transition-colors";
    });
}

function updateSidebarProfile() {
    document.querySelectorAll('.sidebar .font-bold.text-sm').forEach(el => {
        if(el.textContent === 'Користувач' || el.textContent.includes('@') === false) el.textContent = userProfile.name;
    });
}

// ================= СПОВІЩЕННЯ ПРО ЛІМІТИ =================
function checkLimitsAndAlert(category) {
    if (!userLimits[category]) return;

    const spentAmount = transactions
        .filter(t => t.type === 'expense' && t.category === category)
        .reduce((sum, t) => sum + t.amount, 0);

    const limitAmount = userLimits[category];

    if (spentAmount > limitAmount) {
        const conf = categoryConfig[category];
        const overspent = spentAmount - limitAmount;
        
        const toast = document.getElementById('limit-alert-toast');
        const msg = document.getElementById('limit-alert-message');
        
        if (toast && msg) {
            msg.innerHTML = `Ви перевищили встановлений ліміт на <strong>${conf.name}</strong> на <strong>${CURRENCY}${formatMoney(overspent)}</strong>.`;
            
            toast.classList.remove('-translate-y-40', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
            
            setTimeout(() => {
                toast.classList.remove('translate-y-0', 'opacity-100');
                toast.classList.add('-translate-y-40', 'opacity-0');
            }, 4000);
        }
    }
}

// ================= РЕЖИМ КРИТИКА 🌶️ =================
let lastJoke = ""; // Пам'ятаємо минулий жарт, щоб не повторюватися

function showCriticReaction(amount, categoryId, categoryName) {
    let jokes = [];

    // 1. Реакція на дуже великі витрати (пріоритет)
    if (amount >= 3000) {
        jokes.push(`Ого, ${CURRENCY}${formatMoney(amount)} за раз?! Твоя мрія щойно віддалилася ще на рік.`);
        jokes.push(`З такими масштабними витратами тобі доведеться писати код цілодобово, щоб це відбити.`);
        jokes.push(`Мінус ${CURRENCY}${formatMoney(amount)}? Здається, твій бюджет щойно зробив сальто і помер.`);
    } 
    // 2. Реакції по конкретних категоріях
    else {
        switch(categoryId) {
            case 'products':
                jokes.push(`Знову ${CURRENCY}${formatMoney(amount)} на їжу? Майбутній айтішник має харчуватися кодом, а не тринькати бюджет!`);
                jokes.push(`Сподіваюсь, це гречка по акції. Проїдаємо майбутню машину?`);
                break;
            case 'transport':
                jokes.push(`На таксі чи маршрутку? Права отримав, а на Машину ще не назбирав... Доводиться терпіти.`);
                jokes.push(`Може краще було пішки? І для здоров'я корисно, і ${CURRENCY}${formatMoney(amount)} в кишені б залишились.`);
                break;
            case 'clothing':
                jokes.push(`Знову шмотки? Ти ж вже затарювався в PUMA, куди тобі ще?`);
                jokes.push(`Ще одна річ у гардероб... Краще б ці гроші на депозит поклав.`);
                break;
            case 'entertainment':
                jokes.push(`Розважаємось? Тільки не кажи, що це знову на кейси в CS2 або підписку Dota Plus! Габен вже будує собі яхту.`);
                jokes.push(`Мінус ${CURRENCY}${formatMoney(amount)} на розваги. Кодити сайти було б безкоштовно і корисніше!`);
                break;
            case 'shopping':
                jokes.push(`Чергові покупки? Це тобі не верстку робити, тут треба фінансову архітектуру продумувати!`);
                jokes.push(`Сховай картку, поки ми не залишилися без штанів через ці спонтанні бажання.`);
                break;
            case 'utilities':
                jokes.push(`Комуналка... Ну ок, хоча б за інтернет заплатив, щоб бхочь щось було.`);
                jokes.push(`Життя доросле, нічого не скажеш. Але світло в кімнаті вимикай частіше!`);
                break;
            default:
                jokes.push(`Мінус ${CURRENCY}${formatMoney(amount)} на ${categoryName}? Вчити вищу математику було б дешевше.`);
                jokes.push(`Витратив ${CURRENCY}${formatMoney(amount)} незрозуміло на що. З такими темпами ти ще довго будеш пішоходом.`);
        }
    }

    // Фільтруємо жарти, щоб не випав той самий, що й минулого разу
    let availableJokes = jokes.filter(joke => joke !== lastJoke);
    if (availableJokes.length === 0) availableJokes = jokes; // Запобіжник, якщо жарт всього один

    // Випадково обираємо жарт із доступних
    const randomJoke = availableJokes[Math.floor(Math.random() * availableJokes.length)];
    lastJoke = randomJoke; // Запам'ятовуємо його

    const toast = document.getElementById('limit-alert-toast');
    const msg = document.getElementById('limit-alert-message');
    
    if (toast && msg) {
        msg.innerHTML = `<strong>🌶️ Критик каже:</strong><br>${randomJoke}`;
        
        toast.classList.remove('bg-slate-900', 'dark:bg-slate-800');
        toast.classList.add('bg-rose-900');

        toast.classList.remove('-translate-y-40', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        
        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('-translate-y-40', 'opacity-0');
            setTimeout(() => {
                toast.classList.remove('bg-rose-900');
                toast.classList.add('bg-slate-900', 'dark:bg-slate-800');
            }, 300);
        }, 5500); 
    }
}
// ================= ГОЛОВНА =================
function initDashboard() {
    updateDashboardUI();
    document.getElementById('transaction-form').addEventListener('submit', function(e) {
        e.preventDefault();
        let name = document.getElementById('t-name').value;
        const amount = parseFloat(document.getElementById('t-amount').value);
        const category = document.getElementById('t-category').value;
        const type = categoryConfig[category].type; 
        
        if (!name.trim()) name = categoryConfig[category].name;
        
        const now = new Date();
        transactions.unshift({
            id: Date.now(), name, amount, category, type,
            date: `${now.toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' })} о ${now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}` 
        });
        localStorage.setItem('fb_bento_data', JSON.stringify(transactions));
        document.getElementById('t-name').value = ''; document.getElementById('t-amount').value = '';
        updateDashboardUI();

if (type === 'expense') {
            checkLimitsAndAlert(category);
            if (userProfile.criticMode) showCriticReaction(amount, category, categoryConfig[category].name);
        }
    });

    if(document.getElementById('goal-modal-form')) {
        document.getElementById('goal-modal-form').addEventListener('submit', function(e) {
            e.preventDefault();
            userGoal = { name: document.getElementById('modal-g-name').value, amount: parseFloat(document.getElementById('modal-g-amount').value) };
            localStorage.setItem('fb_goal_data', JSON.stringify(userGoal));
            document.getElementById('goal-modal-form').classList.add('hidden');
            document.getElementById('modal-motivation-text').textContent = "Чудова мета! З такою дисципліною все вийде 🚀";
            document.getElementById('modal-success').classList.remove('hidden');
            updateDashboardUI();
            setTimeout(() => {
                closeGoalModal();
                setTimeout(() => {
                    document.getElementById('goal-modal-form').classList.remove('hidden');
                    document.getElementById('modal-success').classList.add('hidden');
                    document.getElementById('modal-g-name').value = ''; document.getElementById('modal-g-amount').value = '';
                }, 300);
            }, 3000);
        });
    }
}

function openGoalModal() { const m = document.getElementById('goal-modal'); if(m) { m.classList.remove('hidden'); m.classList.add('flex'); } }
function closeGoalModal() { const m = document.getElementById('goal-modal'); if(m) { m.classList.add('hidden'); m.classList.remove('flex'); } }

function updateDashboardUI() {
    let income = 0; let expense = 0;
    const list = document.getElementById('transactions-list');
    if(list) list.innerHTML = '';
    
    transactions.forEach(t => { 
        if (t.type === 'income') income += t.amount; 
        else expense += t.amount; 
    });

    if(list) {
        const recentTransactions = transactions.slice(0, 4);
        if (recentTransactions.length === 0) {
            list.innerHTML = '<div class="text-slate-400 text-sm py-4 h-full flex items-center justify-center">Немає операцій</div>';
        } else {
            let htmlStr = '<div class="space-y-2">';
            recentTransactions.forEach(t => {
                const conf = categoryConfig[t.category];
                const sign = t.type === 'income' ? '+' : '-';
                const amountColor = t.type === 'income' ? 'text-emerald-600' : 'text-slate-800 dark:text-white';
                
                htmlStr += `
                    <div class="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center ${conf.bg} ${conf.color} text-xs shrink-0"><i class="fas ${conf.icon}"></i></div>
                            <div class="min-w-0">
                                <div class="font-bold text-sm text-slate-800 dark:text-white truncate max-w-[100px] sm:max-w-[120px]">${t.name}</div>
                                <div class="text-[10px] text-slate-400 truncate">${t.date}</div>
                            </div>
                        </div>
                        <div class="font-bold text-sm ${amountColor} shrink-0 ml-2">${sign}${CURRENCY}${formatMoney(t.amount)}</div>
                    </div>`;
            });
            htmlStr += '</div>';
            
            htmlStr += `
                <a href="history.html" class="block w-full text-center mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs font-bold text-emerald-500 hover:text-emerald-600 transition-colors">
                    Усі операції <i class="fas fa-arrow-right ml-1"></i>
                </a>`;
            list.innerHTML = htmlStr;
        }
    }

    const balance = income - expense;
    if(document.getElementById('total-balance')) {
        document.getElementById('total-balance').textContent = `${CURRENCY}${balance >= 0 ? formatMoney(balance) : '0'}`;
    }
    
    const ring = document.getElementById('balance-ring');
    const percentText = document.getElementById('balance-percent');
    if (ring && percentText) {
        let percent = income > 0 ? Math.max(0, Math.round((balance / income) * 100)) : 0;
        ring.style.strokeDashoffset = 251.2 - (percent / 100) * 251.2;
        percentText.textContent = `${percent}%`;
    }

    const goalBox = document.getElementById('goal-ui-content');
    if (goalBox) {
        if (!userGoal) goalBox.innerHTML = `<div class="text-center opacity-50 h-full flex flex-col items-center justify-center"><i class="fas fa-crosshairs text-3xl mb-2"></i><p class="text-sm font-medium">Ціль не встановлено</p></div>`;
        else {
            const saved = balance > 0 ? balance : 0;
            let goalPercent = Math.min((saved / userGoal.amount) * 100, 100);
            const remaining = userGoal.amount - saved;
            const remainingText = remaining > 0 ? `${CURRENCY}${formatMoney(remaining)}` : 'Ціль досягнуто! 🎉';
            const remainingColor = remaining > 0 ? 'text-slate-800 dark:text-white' : 'text-emerald-500';

            goalBox.innerHTML = `
                <div class="flex flex-col h-full justify-between">
                    <div>
                        <p class="text-sm text-slate-400 mb-1">Збираємо на:</p>
                        <h4 class="font-bold text-xl text-slate-800 dark:text-white truncate">${userGoal.name}</h4>
                        <div class="flex justify-between items-end mt-4 mb-2">
                            <span class="text-emerald-500 font-bold text-xl">${Math.floor(goalPercent)}%</span>
                            <span class="text-xs text-slate-400 font-medium">з ${CURRENCY}${formatMoney(userGoal.amount)}</span>
                        </div>
                        <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div class="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full" style="width: ${goalPercent}%"></div>
                        </div>
                    </div>
                    
                    <div class="mt-4 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl text-center border border-slate-100 dark:border-slate-700/50">
                        <p class="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Залишилось зібрати</p>
                        <p class="font-bold text-lg ${remainingColor}">${remainingText}</p>
                    </div>
                </div>`;
        }
    }
}

// ================= СТАТИСТИКА =================
let currentTimeFilter = 'all';
let currentViewType = 'doughnut'; // 'doughnut' або 'bar'

function initStatistics() {
    // 1. Кнопки часу (Тиждень, Місяць тощо)
    const timeButtons = document.querySelectorAll('.filter-btn');
    timeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            timeButtons.forEach(b => { b.classList.remove('bg-emerald-500', 'shadow-lg'); b.classList.add('bg-white/10'); });
            e.target.classList.remove('bg-white/10');
            e.target.classList.add('bg-emerald-500', 'shadow-lg');
            currentTimeFilter = e.target.getAttribute('data-filter');
            renderChart();
        });
    });

    // 2. Кнопки типу графіка (Категорії / Тренди)
    const btnDoughnut = document.getElementById('btn-type-doughnut');
    const btnBar = document.getElementById('btn-type-bar');

    if (btnDoughnut && btnBar) {
        btnDoughnut.addEventListener('click', () => {
            currentViewType = 'doughnut';
            btnDoughnut.classList.replace('bg-transparent', 'bg-slate-700');
            btnDoughnut.classList.replace('text-slate-400', 'text-white');
            btnBar.classList.remove('bg-slate-700', 'text-white');
            btnBar.classList.add('text-slate-400');
            renderChart();
        });
        btnBar.addEventListener('click', () => {
            currentViewType = 'bar';
            btnBar.classList.add('bg-slate-700', 'text-white');
            btnBar.classList.remove('text-slate-400');
            btnDoughnut.classList.remove('bg-slate-700', 'text-white');
            btnDoughnut.classList.add('text-slate-400');
            renderChart();
        });
    }
    renderChart();
}

function getTrendHTML(current, prev, isExpense) {
    if (prev === 0) return ''; 
    const diff = current - prev;
    const percent = Math.abs(Math.round((diff / prev) * 100));
    if (diff === 0) return `<span class="text-[10px] text-slate-400 font-medium ml-2 px-2 py-0.5 bg-slate-100 rounded-md">Без змін</span>`;

    let color = '';
    let icon = diff > 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    
    // Для витрат ріст - це погано (червоний). Для доходів/балансу - добре (зелений).
    if (isExpense) color = diff > 0 ? 'text-rose-500 bg-rose-100' : 'text-emerald-500 bg-emerald-100';
    else color = diff > 0 ? 'text-emerald-500 bg-emerald-100' : 'text-rose-500 bg-rose-100';

    return `<span class="text-[10px] font-bold ${color} ml-2 px-2 py-0.5 rounded-md"><i class="fas ${icon}"></i> ${percent}%</span>`;
}

function renderChart() {
    const now = Date.now();
    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    
    let periodMs = 0;
    if (currentTimeFilter === 'day') periodMs = DAY_IN_MS;
    else if (currentTimeFilter === 'week') periodMs = DAY_IN_MS * 7;
    else if (currentTimeFilter === 'month') periodMs = DAY_IN_MS * 30;
    else if (currentTimeFilter === 'year') periodMs = DAY_IN_MS * 365;

    let filtered = transactions;
    let prevFiltered = [];

    // Фільтруємо поточний і минулий періоди (для порівняння)
    if (periodMs > 0) {
        filtered = transactions.filter(t => (now - t.id) <= periodMs);
        prevFiltered = transactions.filter(t => (now - t.id) > periodMs && (now - t.id) <= periodMs * 2);
    }

    let totalExpense = 0, totalIncome = 0;
    let prevExpense = 0, prevIncome = 0;
    const expensesByCat = {};
    const expensesByDate = {}; // Для стовпчикового графіка

    // Аналіз поточного періоду
    // Робимо копію і перевертаємо, щоб дати йшли від старіших до новіших
    [...filtered].reverse().forEach(t => { 
        if (t.type === 'expense') {
            expensesByCat[t.category] = (expensesByCat[t.category] || 0) + t.amount; 
            totalExpense += t.amount; 
            
            // Групуємо по даті (беремо тільки "17 черв.")
            const dateStr = t.date.split(' о ')[0];
            expensesByDate[dateStr] = (expensesByDate[dateStr] || 0) + t.amount;
        } else {
            totalIncome += t.amount;
        }
    });

    // Аналіз минулого періоду
    prevFiltered.forEach(t => { 
        if (t.type === 'expense') prevExpense += t.amount; 
        else prevIncome += t.amount; 
    });

    // 1. ОНОВЛЕННЯ ТЕКСТІВ ТА ТРЕНДІВ
    if(document.getElementById('stat-period-income')) document.getElementById('stat-period-income').textContent = `+${CURRENCY}${formatMoney(totalIncome)}`;
    if(document.getElementById('trend-income')) document.getElementById('trend-income').innerHTML = getTrendHTML(totalIncome, prevIncome, false);

    if(document.getElementById('stat-period-expense')) document.getElementById('stat-period-expense').textContent = `-${CURRENCY}${formatMoney(totalExpense)}`;
    if(document.getElementById('trend-expense')) document.getElementById('trend-expense').innerHTML = getTrendHTML(totalExpense, prevExpense, true);
    
    const flowEl = document.getElementById('stat-period-flow');
    if (flowEl) {
        const netFlow = totalIncome - totalExpense;
        const prevNetFlow = prevIncome - prevExpense;
        flowEl.textContent = `${netFlow > 0 ? '+' : ''}${CURRENCY}${formatMoney(netFlow)}`;
        flowEl.className = `text-2xl font-bold ${netFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`;
        if(document.getElementById('trend-balance')) document.getElementById('trend-balance').innerHTML = getTrendHTML(netFlow, prevNetFlow, false);
    }

    if(document.getElementById('total-expense-stat')) document.getElementById('total-expense-stat').textContent = `${CURRENCY}${formatMoney(totalExpense)}`;

    // 2. ОНОВЛЕННЯ СПИСКУ ДЕТАЛІЗАЦІЇ
    const catListEl = document.getElementById('category-details-list');
    if (catListEl) {
        catListEl.innerHTML = '';
        const sortedCats = Object.entries(expensesByCat).sort((a, b) => b[1] - a[1]);
        
        if (sortedCats.length === 0) {
            catListEl.innerHTML = '<div class="text-center text-slate-400 py-10 text-sm">Немає витрат за цей період</div>';
        } else {
            sortedCats.forEach(([cat, amount]) => {
                const conf = categoryConfig[cat];
                const percent = Math.round((amount / totalExpense) * 100);
                catListEl.innerHTML += `
                    <div class="flex justify-between items-center mb-4 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full flex items-center justify-center ${conf.bg} ${conf.color} shrink-0 text-sm"><i class="fas ${conf.icon}"></i></div>
                            <div>
                                <p class="font-bold text-slate-800 dark:text-white text-sm">${conf.name}</p>
                                <p class="text-[11px] text-slate-400 font-medium">${percent}% від витрат</p>
                            </div>
                        </div>
                        <div class="font-bold text-slate-800 dark:text-white text-sm shrink-0 ml-2">${CURRENCY}${formatMoney(amount)}</div>
                    </div>`;
            });
        }
    }

    // 3. МАЛЮВАННЯ ГРАФІКА (Doughnut або Bar)
    const chartEl = document.getElementById('analyticsChart');
    if (!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (currentChart) currentChart.destroy();

    const categoryColors = { 'products': '#3b82f6', 'transport': '#f43f5e', 'utilities': '#f59e0b', 'clothing': '#ec4899', 'entertainment': '#a855f7', 'shopping': '#6366f1', 'other': '#64748b' };

    if (currentViewType === 'doughnut') {
        const catKeys = Object.keys(expensesByCat);
        const data = Object.values(expensesByCat);
        const bgColors = catKeys.map(k => categoryColors[k] || '#10b981');

        currentChart = new Chart(ctx, {
            type: 'doughnut',
            data: { 
                labels: catKeys.map(k => categoryConfig[k].name), 
                datasets: [{ data: data.length ? data : [1], backgroundColor: data.length ? bgColors : ['rgba(255, 255, 255, 0.05)'], borderWidth: 0, hoverOffset: data.length ? 10 : 0 }] 
            },
            options: {
                layout: { padding: 20 }, responsive: true, maintainAspectRatio: false, cutout: '75%',
                plugins: {
                    legend: { display: data.length > 0, position: 'right', labels: { color: 'rgba(255, 255, 255, 0.8)', font: { family: 'Inter', size: 14 }, padding: 20, usePointStyle: true, pointStyle: 'circle' } },
                    tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 14, family: 'Inter' }, bodyFont: { size: 16, family: 'Inter', weight: 'bold' }, padding: 16, cornerRadius: 12, callbacks: { label: function(context) { return ` ${CURRENCY}${formatMoney(context.raw)}`; } } },
                    datalabels: { display: false } // ПРИБИРАЄМО ЦИФРИ З КОЛА
                }
            }
        });
    } 
    else if (currentViewType === 'bar') {
        const dates = Object.keys(expensesByDate);
        const amounts = Object.values(expensesByDate);

        currentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates.length ? dates : ['Немає даних'],
                datasets: [{
                    label: 'Витрати', data: amounts.length ? amounts : [0], backgroundColor: '#10b981', borderRadius: 6, barThickness: 'flex', maxBarThickness: 40
                }]
            },
            options: {
                layout: { padding: 10 }, responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: 'rgba(255, 255, 255, 0.5)', callback: function(value) { return CURRENCY + value; } } },
                    x: { grid: { display: false }, ticks: { color: 'rgba(255, 255, 255, 0.8)' } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 14, family: 'Inter' }, bodyFont: { size: 16, family: 'Inter', weight: 'bold' }, padding: 16, cornerRadius: 12 },
                    datalabels: { display: false }
                }
            }
        });
    }
}
// ================= ІСТОРІЯ =================
function initHistory() {
    const searchInput = document.getElementById('search-input');
    const typeButtons = document.querySelectorAll('.type-filter');
    let currentTypeFilter = 'all'; let searchQuery = '';

    function renderHistory() {
        const list = document.getElementById('full-history-list');
        if(!list) return; list.innerHTML = '';
        let filtered = transactions.filter(t => {
            const matchType = currentTypeFilter === 'all' || t.type === currentTypeFilter;
            const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || categoryConfig[t.category].name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchType && matchSearch;
        });

        if (filtered.length === 0) { list.innerHTML = `<div class="flex flex-col items-center justify-center py-20 text-slate-400"><i class="fas fa-search text-4xl mb-4 opacity-50"></i><p class="font-medium">Записів не знайдено</p></div>`; return; }

        filtered.forEach(t => {
            const conf = categoryConfig[t.category];
            const sign = t.type === 'income' ? '+' : '-';
            const amountColor = t.type === 'income' ? 'text-emerald-600' : 'text-slate-800 dark:text-white';
            
            list.innerHTML += `
                <div class="flex justify-between items-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600 group">
                    <div class="flex items-center gap-5">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center ${conf.bg} ${conf.color} shadow-inner"><i class="fas ${conf.icon} text-lg"></i></div>
                        <div>
                            <div class="font-bold text-slate-800 dark:text-white text-base">${t.name}</div>
                            <div class="text-xs text-slate-400 font-medium mt-0.5">${conf.name} • ${t.date}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-6">
                        <div class="font-bold text-lg tracking-tight ${amountColor}">${sign}${CURRENCY}${formatMoney(t.amount)}</div>
                        <button onclick="deleteTransaction(${t.id})" class="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"><i class="fas fa-trash text-sm"></i></button>
                    </div>
                </div>`;
        });
    }

    if(searchInput) searchInput.addEventListener('input', (e) => { searchQuery = e.target.value; renderHistory(); });
    typeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            typeButtons.forEach(b => { b.classList.remove('bg-white', 'shadow-sm', 'text-slate-800', 'dark:text-slate-800', 'active'); b.classList.add('text-slate-400'); });
            e.target.classList.add('bg-white', 'shadow-sm', 'text-slate-800', 'dark:text-slate-800', 'active'); e.target.classList.remove('text-slate-400');
            currentTypeFilter = e.target.getAttribute('data-type'); renderHistory();
        });
    });
    renderHistory();
}

function deleteTransaction(id) { transactions = transactions.filter(t => t.id !== id); localStorage.setItem('fb_bento_data', JSON.stringify(transactions)); if(document.getElementById('full-history-list')) initHistory(); if(document.getElementById('transaction-form')) updateDashboardUI(); }

// ================= ЛІМІТИ =================
function initLimits() {
    const form = document.getElementById('limit-form');
    if(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            userLimits[document.getElementById('l-category').value] = parseFloat(document.getElementById('l-amount').value);
            localStorage.setItem('fb_limits_data', JSON.stringify(userLimits));
            document.getElementById('l-amount').value = ''; renderLimits();
        });
    }
    renderLimits();
}

function renderLimits() {
    const list = document.getElementById('limits-list');
    if(!list) return; list.innerHTML = '';
    const expensesByCat = {};
    transactions.forEach(t => { if (t.type === 'expense') expensesByCat[t.category] = (expensesByCat[t.category] || 0) + t.amount; });

    const activeLimits = Object.keys(userLimits);
    if (activeLimits.length === 0) { list.innerHTML = `<div class="text-center py-10 opacity-50"><i class="fas fa-shield-alt text-4xl mb-3 text-slate-400"></i><p class="font-medium text-slate-500">У вас ще немає встановлених лімітів</p></div>`; return; }

    activeLimits.forEach(cat => {
        const conf = categoryConfig[cat];
        const limitAmount = userLimits[cat];
        const spentAmount = expensesByCat[cat] || 0;
        let percent = Math.min((spentAmount / limitAmount) * 100, 100);

        let barColor = 'bg-emerald-500'; let textColor = 'text-emerald-500';
        if (percent > 75 && percent < 100) { barColor = 'bg-amber-400'; textColor = 'text-amber-500'; } 
        else if (percent >= 100) { barColor = 'bg-rose-500'; textColor = 'text-rose-500'; }

        const remaining = limitAmount - spentAmount;
        const remainingText = remaining >= 0 ? `Залишилось: ${CURRENCY}${formatMoney(remaining)}` : `Перевищено на ${CURRENCY}${formatMoney(Math.abs(remaining))}`;

        list.innerHTML += `
            <div class="relative group">
                <div class="flex justify-between items-end mb-2">
                    <div class="flex items-center gap-2"><i class="fas ${conf.icon} text-slate-400 w-5 text-center"></i><span class="font-bold text-slate-800 dark:text-white">${conf.name}</span></div>
                    <div class="text-right"><span class="${textColor} font-bold">${CURRENCY}${formatMoney(spentAmount)}</span><span class="text-slate-400 text-sm"> / ${CURRENCY}${formatMoney(limitAmount)}</span></div>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden"><div class="${barColor} h-full rounded-full transition-all duration-700" style="width: ${percent}%"></div></div>
                <div class="flex justify-between items-center mt-1"><span class="text-xs text-slate-400 font-medium">${remainingText}</span><button onclick="deleteLimit('${cat}')" class="text-xs text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">Видалити ліміт</button></div>
            </div>`;
    });
}
function deleteLimit(category) { delete userLimits[category]; localStorage.setItem('fb_limits_data', JSON.stringify(userLimits)); renderLimits(); }

// ================= НАЛАШТУВАННЯ =================
function initSettings() {
    document.getElementById('user-name-input').value = userProfile.name;
    document.getElementById('user-email-input').value = userProfile.email;

    document.getElementById('profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        userProfile.name = document.getElementById('user-name-input').value;
        userProfile.email = document.getElementById('user-email-input').value;
        localStorage.setItem('fb_user_profile', JSON.stringify(userProfile));
        updateSidebarProfile();
        alert("Профіль успішно оновлено!");
    });

    const currencyInput = document.getElementById('user-currency-input');
    const themeInput = document.getElementById('user-theme-input');
    const criticInput = document.getElementById('user-critic-input');
    
    if(currencyInput && themeInput) {
        currencyInput.value = userProfile.currency || '₴';
        themeInput.checked = userProfile.theme === 'dark';
        if(criticInput) criticInput.checked = userProfile.criticMode === true;

        document.getElementById('app-settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            userProfile.currency = currencyInput.value;
            userProfile.theme = themeInput.checked ? 'dark' : 'light';
            userProfile.criticMode = criticInput ? criticInput.checked : false;
            localStorage.setItem('fb_user_profile', JSON.stringify(userProfile));
            
            alert("Налаштування інтерфейсу оновлено!");
            window.location.reload();
        });
    }

    const clearBtn = document.getElementById('clear-data-btn');
    if(clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm("УВАГА! Ви дійсно хочете видалити всі транзакції, цілі та ліміти? Цю дію неможливо скасувати.")) {
                localStorage.clear(); 
                alert("Всі дані успішно видалено. Сторінка буде перезавантажена.");
                window.location.href = 'index.html'; 
            }
        });
    }
}
