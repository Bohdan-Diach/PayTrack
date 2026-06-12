// ================= БАЗА ДАНИХ =================
let transactions = JSON.parse(localStorage.getItem('fb_bento_data')) || [];
let userGoal = JSON.parse(localStorage.getItem('fb_goal_data')) || null;
let userLimits = JSON.parse(localStorage.getItem('fb_limits_data')) || {};
// Нова база для профілю
let userProfile = JSON.parse(localStorage.getItem('fb_user_profile')) || { name: 'Користувач', email: 'finance@buddy.ua' };

let currentChart = null; 

// ================= ОНОВЛЕНІ КАТЕГОРІЇ =================
const categoryConfig = {
    'income': { name: 'Дохід', icon: 'fa-arrow-down', color: 'text-emerald-500', bg: 'bg-emerald-100' },
    'products': { name: 'Продукти', icon: 'fa-shopping-cart', color: 'text-blue-500', bg: 'bg-blue-100' },
    'transport': { name: 'Транспорт', icon: 'fa-car', color: 'text-rose-500', bg: 'bg-rose-100' },
    'utilities': { name: 'Ком. послуги', icon: 'fa-bolt', color: 'text-amber-500', bg: 'bg-amber-100' },
    'clothing': { name: 'Одяг', icon: 'fa-tshirt', color: 'text-pink-500', bg: 'bg-pink-100' },
    'entertainment': { name: 'Розваги', icon: 'fa-film', color: 'text-purple-500', bg: 'bg-purple-100' },
    'shopping': { name: 'Покупки', icon: 'fa-shopping-bag', color: 'text-indigo-500', bg: 'bg-indigo-100' },
    'other': { name: 'Інше', icon: 'fa-box', color: 'text-slate-500', bg: 'bg-slate-100' }
};

function formatMoney(amount) { return Math.floor(amount).toLocaleString('uk-UA'); }

// ================= МАРШРУТИЗАТОР =================
document.addEventListener('DOMContentLoaded', () => {
    updateSidebarProfile();
    updateMobileNavigation();
    updateDesktopNavigation();
    if (document.getElementById('transaction-form')) initDashboard();
    if (document.getElementById('analyticsChart')) initStatistics();
    if (document.getElementById('full-history-list')) initHistory();
    if (document.getElementById('limits-list')) initLimits();
    if (document.getElementById('profile-form')) initSettings();
});

// Функція автоматичного підсвічування бокового меню (ПК)
function updateDesktopNavigation() {
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html"; 
    
    // Знаходимо навігацію в боковому меню
    const desktopNav = document.querySelector('aside.sidebar nav');
    if (!desktopNav) return;

    // Перебираємо всі посилання
    const links = desktopNav.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        
        if (href === page) {
            // АКТИВНА кнопка (Темно-зелена)
            link.className = "flex items-center gap-4 bg-green-brand text-white px-5 py-3 rounded-2xl font-medium shadow-lg";
        } else {
            // НЕАКТИВНА кнопка (Сіра, прозора)
            link.className = "flex items-center gap-4 px-5 py-3 rounded-2xl font-medium text-slate-500 hover:bg-slate-100 transition-colors";
        }
    });
}

// Функція автоматичного підсвічування мобільного меню
function updateMobileNavigation() {
    // Отримуємо назву поточного файлу з URL (напр. "history.html")
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html"; 
    
    // Знаходимо мобільне меню
    const mobileNav = document.querySelector('nav.fixed.bottom-0');
    if (!mobileNav) return;

    // Перебираємо всі посилання в меню
    const links = mobileNav.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        
        if (href === page) {
            // Робимо іконку АКТИВНОЮ (зеленою)
            link.className = "flex flex-col items-center p-2 text-emerald-600";
        } else {
            // Робимо іконку НЕАКТИВНОЮ (сірою)
            link.className = "flex flex-col items-center p-2 text-slate-400 hover:text-emerald-500 transition-colors";
        }
    });
}

// Функція оновлення імені в бічній панелі
function updateSidebarProfile() {
    const nameEls = document.querySelectorAll('.sidebar .font-bold.text-sm');
    nameEls.forEach(el => {
        if(el.textContent === 'Користувач' || el.textContent.includes('@') === false) {
            el.textContent = userProfile.name;
        }
    });
}

// ================= 1. ГОЛОВНА СТОРІНКА =================
function initDashboard() {
    updateDashboardUI();

    document.getElementById('transaction-form').addEventListener('submit', function(e) {
        e.preventDefault();
        let name = document.getElementById('t-name').value;
        const amount = parseFloat(document.getElementById('t-amount').value);
        const category = document.getElementById('t-category').value;
        const type = category === 'income' ? 'income' : 'expense';

        if (!name.trim()) name = categoryConfig[category].name;

        transactions.unshift({
            id: Date.now(), name: name, amount: amount, category: category, type: type,
            date: new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' })
        });
        localStorage.setItem('fb_bento_data', JSON.stringify(transactions));

        document.getElementById('t-name').value = '';
        document.getElementById('t-amount').value = '';
        updateDashboardUI();
    });

    if(document.getElementById('goal-modal-form')) {
        document.getElementById('goal-modal-form').addEventListener('submit', function(e) {
            e.preventDefault();
            userGoal = {
                name: document.getElementById('modal-g-name').value,
                amount: parseFloat(document.getElementById('modal-g-amount').value)
            };
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
                    document.getElementById('modal-g-name').value = '';
                    document.getElementById('modal-g-amount').value = '';
                }, 300);
            }, 3000);
        });
    }
}

function openGoalModal() {
    const modal = document.getElementById('goal-modal');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeGoalModal() {
    const modal = document.getElementById('goal-modal');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

function updateDashboardUI() {
    let income = 0; let expense = 0;
    const list = document.getElementById('transactions-list');
    if(list) list.innerHTML = '';

    transactions.forEach(t => {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
    });

    if(list) {
        const recentTransactions = transactions.slice(0, 3);
        if (recentTransactions.length === 0) {
            list.innerHTML = '<div class="text-slate-400 text-sm py-4">Немає операцій</div>';
        } else {
            recentTransactions.forEach(t => {
                const conf = categoryConfig[t.category];
                const sign = t.type === 'income' ? '+' : '-';
                const amountColor = t.type === 'income' ? 'text-emerald-600' : 'text-slate-800';

                list.innerHTML += `
                    <div class="flex justify-between items-center p-2 rounded-xl bg-slate-50 mb-2">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center ${conf.bg} ${conf.color} text-xs"><i class="fas ${conf.icon}"></i></div>
                            <div>
                                <div class="font-bold text-sm text-slate-800 truncate w-24">${t.name}</div>
                                <div class="text-[10px] text-slate-400">${t.date}</div>
                            </div>
                        </div>
                        <div class="font-bold text-sm ${amountColor}">${sign}₴${formatMoney(t.amount)}</div>
                    </div>`;
            });
        }
    }

    const balance = income - expense;
    if(document.getElementById('total-balance')) {
        document.getElementById('total-balance').textContent = balance >= 0 ? formatMoney(balance) : '0';
    }
    
    const ring = document.getElementById('balance-ring');
    const percentText = document.getElementById('balance-percent');
    if (ring && percentText) {
        let percent = income > 0 ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;
        ring.style.strokeDashoffset = 251.2 - (percent / 100) * 251.2;
        percentText.textContent = `${percent}%`;
    }

    const goalBox = document.getElementById('goal-ui-content');
    if (goalBox) {
        if (!userGoal) {
            goalBox.innerHTML = `<div class="text-center opacity-50"><i class="fas fa-crosshairs text-3xl mb-2"></i><p class="text-sm font-medium">Ціль не встановлено</p></div>`;
        } else {
            const saved = balance > 0 ? balance : 0;
            let goalPercent = Math.min((saved / userGoal.amount) * 100, 100);
            goalBox.innerHTML = `
                <div>
                    <p class="text-sm text-slate-400 mb-1">Збираємо на:</p>
                    <h4 class="font-bold text-xl text-slate-800 truncate">${userGoal.name}</h4>
                    <div class="flex justify-between items-end mt-4 mb-2">
                        <span class="text-emerald-500 font-bold text-lg">${Math.floor(goalPercent)}%</span>
                        <span class="text-sm text-slate-400">з ₴${formatMoney(userGoal.amount)}</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div class="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full" style="width: ${goalPercent}%"></div>
                    </div>
                </div>`;
        }
    }
}

// ================= 2. СТАТИСТИКА ТА ПОРАДИ =================
function initStatistics() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            buttons.forEach(b => { b.classList.remove('bg-emerald-500', 'shadow-lg'); b.classList.add('bg-white/10'); });
            e.target.classList.remove('bg-white/10');
            e.target.classList.add('bg-emerald-500', 'shadow-lg');
            renderChart(e.target.getAttribute('data-filter'));
        });
    });
    renderChart('all');
}

function renderChart(timeFilter) {
    const now = Date.now();
    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    let filteredTransactions = transactions.filter(t => t.type === 'expense');

    if (timeFilter === 'day') filteredTransactions = filteredTransactions.filter(t => (now - t.id) <= DAY_IN_MS);
    else if (timeFilter === 'week') filteredTransactions = filteredTransactions.filter(t => (now - t.id) <= DAY_IN_MS * 7);
    else if (timeFilter === 'month') filteredTransactions = filteredTransactions.filter(t => (now - t.id) <= DAY_IN_MS * 30);
    else if (timeFilter === 'year') filteredTransactions = filteredTransactions.filter(t => (now - t.id) <= DAY_IN_MS * 365);

    const expensesByCat = {};
    let totalExpense = 0;

    filteredTransactions.forEach(t => {
        expensesByCat[t.category] = (expensesByCat[t.category] || 0) + t.amount;
        totalExpense += t.amount;
    });

    document.getElementById('total-expense-stat').textContent = `₴${formatMoney(totalExpense)}`;

    const hintElement = document.getElementById('empty-state-hint');
    if (totalExpense === 0) {
        if(hintElement) hintElement.classList.remove('hidden');
    } else {
        if(hintElement) hintElement.classList.add('hidden');
    }

    // Генерація розумної поради
    generateSmartAdvice(expensesByCat, totalExpense);

    const labels = Object.keys(expensesByCat).map(k => categoryConfig[k].name);
    const data = Object.values(expensesByCat);
    
    const categoryColors = {
        'products': '#3b82f6',      
        'transport': '#f43f5e',     
        'utilities': '#f59e0b',
        'clothing': '#ec4899',
        'entertainment': '#a855f7', 
        'shopping': '#6366f1',      
        'other': '#64748b'          
    };
    const bgColors = Object.keys(expensesByCat).map(k => categoryColors[k] || '#10b981');

    const ctx = document.getElementById('analyticsChart').getContext('2d');
    if (currentChart) currentChart.destroy();

    currentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data.length ? data : [1],
                backgroundColor: data.length ? bgColors : ['rgba(255, 255, 255, 0.05)'],
                borderWidth: 0,
                hoverOffset: data.length ? 15 : 0
            }]
        },
        options: {
            layout: { padding: 25 },
            responsive: true, maintainAspectRatio: false, cutout: '75%',
            plugins: {
                legend: { display: data.length > 0, position: 'right', labels: { color: 'rgba(255, 255, 255, 0.8)', font: { family: 'Inter', size: 14 }, padding: 24, usePointStyle: true, pointStyle: 'circle' } },
                tooltip: {
                    enabled: data.length > 0, backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 14, family: 'Inter' },
                    bodyFont: { size: 16, family: 'Inter', weight: 'bold' }, padding: 16, cornerRadius: 12,
                    callbacks: { label: function(context) { return ` ₴${formatMoney(context.raw)}`; } }
                }
            }
        }
    });
}

function generateSmartAdvice(expenses, total) {
    const adviceEl = document.getElementById('smart-advice-text');
    if(!adviceEl) return;

    if (total === 0) {
        adviceEl.innerHTML = "Поки що немає витрат за цей період. Чудовий час, щоб відкласти гроші в скарбничку! 🐷";
        return;
    }

    // Шукаємо найбільшу категорію
    let maxCat = '';
    let maxAmount = 0;
    for(const [cat, amount] of Object.entries(expenses)) {
        if(amount > maxAmount) { maxAmount = amount; maxCat = cat; }
    }

    let advice = `За цей період ви найбільше витратили на <strong>${categoryConfig[maxCat].name}</strong> (₴${formatMoney(maxAmount)}).<br><br>`;

    const tips = {
        'products': "🛒 Порада: Спробуйте складати список перед походом у магазин і не ходити туди натщесерце — це економить до 20% бюджету!",
        'transport': "🚗 Порада: Можливо, варто розглянути проїзний або частіше гуляти пішки для здоров'я? Це корисно і безкоштовно.",
        'utilities': "💡 Порада: Зверніть увагу на енергозберігаючі лампочки та вимикайте прилади з розеток. Копійка гривню береже!",
        'clothing': "👕 Порада: Застосовуйте 'правило 24 годин': перед покупкою почекайте добу. Якщо річ все ще потрібна — тоді беріть.",
        'entertainment': "🎬 Порада: Розваги — це важливо! Але спробуйте також шукати безкоштовні івенти у вашому місті.",
        'shopping': "🛍️ Порада: Емоційні покупки — головний ворог бюджету. Перевірте, чи дійсно вам потрібна ця річ прямо зараз.",
        'other': "📦 Порада: Спробуйте деталізувати 'Інші' витрати при додаванні (вказуйте конкретну назву), щоб краще розуміти, куди зникають гроші."
    };

    adviceEl.innerHTML = advice + (tips[maxCat] || "Продовжуйте стежити за своїми витратами, ви на правильному шляху! 🌟");
}

// ================= 3. ІСТОРІЯ =================
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

        if (filtered.length === 0) {
            list.innerHTML = `<div class="flex flex-col items-center justify-center py-20 text-slate-400"><i class="fas fa-search text-4xl mb-4 opacity-50"></i><p class="font-medium">Записів не знайдено</p></div>`;
            return;
        }

        filtered.forEach(t => {
            const conf = categoryConfig[t.category];
            const sign = t.type === 'income' ? '+' : '-';
            const amountColor = t.type === 'income' ? 'text-emerald-600' : 'text-slate-800';

            list.innerHTML += `
                <div class="flex justify-between items-center p-4 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100 group">
                    <div class="flex items-center gap-5">
                        <div class="w-12 h-12 rounded-full flex items-center justify-center ${conf.bg} ${conf.color} shadow-inner"><i class="fas ${conf.icon} text-lg"></i></div>
                        <div>
                            <div class="font-bold text-slate-800 text-base">${t.name}</div>
                            <div class="text-xs text-slate-400 font-medium mt-0.5">${conf.name} • ${t.date}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-6">
                        <div class="font-bold text-lg tracking-tight ${amountColor}">${sign}₴${formatMoney(t.amount)}</div>
                        <button onclick="deleteTransaction(${t.id})" class="w-8 h-8 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"><i class="fas fa-trash text-sm"></i></button>
                    </div>
                </div>`;
        });
    }

    if(searchInput) searchInput.addEventListener('input', (e) => { searchQuery = e.target.value; renderHistory(); });
    typeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            typeButtons.forEach(b => { b.classList.remove('bg-white', 'shadow-sm', 'text-slate-800', 'active'); b.classList.add('text-slate-400'); });
            e.target.classList.add('bg-white', 'shadow-sm', 'text-slate-800', 'active'); e.target.classList.remove('text-slate-400');
            currentTypeFilter = e.target.getAttribute('data-type'); renderHistory();
        });
    });
    renderHistory();
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem('fb_bento_data', JSON.stringify(transactions));
    if(document.getElementById('full-history-list')) initHistory();
    if(document.getElementById('transaction-form')) updateDashboardUI();
}

// ================= 4. ЛІМІТИ =================
function initLimits() {
    const form = document.getElementById('limit-form');
    if(form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            userLimits[document.getElementById('l-category').value] = parseFloat(document.getElementById('l-amount').value);
            localStorage.setItem('fb_limits_data', JSON.stringify(userLimits));
            document.getElementById('l-amount').value = '';
            renderLimits();
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
    if (activeLimits.length === 0) {
        list.innerHTML = `<div class="text-center py-10 opacity-50"><i class="fas fa-shield-alt text-4xl mb-3 text-slate-400"></i><p class="font-medium text-slate-500">У вас ще немає встановлених лімітів</p></div>`;
        return;
    }

    activeLimits.forEach(cat => {
        const conf = categoryConfig[cat];
        const limitAmount = userLimits[cat];
        const spentAmount = expensesByCat[cat] || 0;
        let percent = Math.min((spentAmount / limitAmount) * 100, 100);

        let barColor = 'bg-emerald-500'; let textColor = 'text-emerald-500';
        if (percent > 75 && percent < 100) { barColor = 'bg-amber-400'; textColor = 'text-amber-500'; } 
        else if (percent >= 100) { barColor = 'bg-rose-500'; textColor = 'text-rose-500'; }

        const remaining = limitAmount - spentAmount;
        const remainingText = remaining >= 0 ? `Залишилось: ₴${formatMoney(remaining)}` : `Перевищено на ₴${formatMoney(Math.abs(remaining))}`;

        list.innerHTML += `
            <div class="relative group">
                <div class="flex justify-between items-end mb-2">
                    <div class="flex items-center gap-2"><i class="fas ${conf.icon} text-slate-400 w-5 text-center"></i><span class="font-bold text-slate-800">${conf.name}</span></div>
                    <div class="text-right"><span class="${textColor} font-bold">₴${formatMoney(spentAmount)}</span><span class="text-slate-400 text-sm"> / ₴${formatMoney(limitAmount)}</span></div>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden"><div class="${barColor} h-full rounded-full transition-all duration-700" style="width: ${percent}%"></div></div>
                <div class="flex justify-between items-center mt-1"><span class="text-xs text-slate-400 font-medium">${remainingText}</span><button onclick="deleteLimit('${cat}')" class="text-xs text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">Видалити ліміт</button></div>
            </div>`;
    });
}

function deleteLimit(category) {
    delete userLimits[category];
    localStorage.setItem('fb_limits_data', JSON.stringify(userLimits));
    renderLimits();
}

// ================= 5. НАЛАШТУВАННЯ =================
function initSettings() {
    // Підвантажуємо дані в форму
    document.getElementById('user-name-input').value = userProfile.name;
    document.getElementById('user-email-input').value = userProfile.email;

    // Збереження профілю
    document.getElementById('profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        userProfile.name = document.getElementById('user-name-input').value;
        userProfile.email = document.getElementById('user-email-input').value;
        localStorage.setItem('fb_user_profile', JSON.stringify(userProfile));
        
        updateSidebarProfile();
        alert("Профіль успішно оновлено!");
    });

    // Очищення даних
    const clearBtn = document.getElementById('clear-data-btn');
    if(clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm("УВАГА! Ви дійсно хочете видалити всі транзакції, цілі та ліміти? Цю дію неможливо скасувати.")) {
                localStorage.clear(); // Очищає все, включаючи профіль
                alert("Всі дані успішно видалено. Сторінка буде перезавантажена.");
                window.location.href = 'index.html'; 
            }
        });
    }
}
