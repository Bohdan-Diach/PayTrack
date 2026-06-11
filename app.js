let transactions = JSON.parse(localStorage.getItem('fb_transactions')) || [];
let goal = JSON.parse(localStorage.getItem('fb_goal')) || null;
let expenseChart = null;

const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const toastIcon = document.getElementById('toast-icon');

const categoryNames = {
    products: 'Продукти',
    transport: 'Транспорт/Авто',
    entertainment: 'Розваги',
    shopping: 'Покупки',
    other_expense: 'Інші витрати',
    salary: 'Зарплата',
    other_income: 'Інший дохід'
};

const categoryColors = {
    products: '#34d399',      
    transport: '#60a5fa',     
    entertainment: '#a78bfa', 
    shopping: '#fbbf24',      
    other_expense: '#94a3b8'  
};

function init() {
    initChart();
    updateGoalUI();
    updateTransactionsUI();
}

function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    
    toast.classList.remove('bg-emerald-500', 'bg-rose-500', 'bg-indigo-500');
    toastIcon.className = '';
    
    if (type === 'success') {
        toast.classList.add('bg-emerald-500');
        toastIcon.className = 'fas fa-check-circle text-xl';
    } else if (type === 'error') {
        toast.classList.add('bg-rose-500');
        toastIcon.className = 'fas fa-exclamation-circle text-xl';
    } else {
        toast.classList.add('bg-indigo-500');
        toastIcon.className = 'fas fa-info-circle text-xl';
    }

    toast.classList.remove('-translate-y-10', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    
    setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-10', 'opacity-0');
    }, 2500);
}

function formatMoney(amount) {
    return parseFloat(amount).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

document.getElementById('goal-form').addEventListener('submit', function(e) {
    e.preventDefault(); 
    const name = document.getElementById('g-name').value;
    const amount = parseFloat(document.getElementById('g-amount').value);

    goal = { name, amount };
    localStorage.setItem('fb_goal', JSON.stringify(goal));
    
    showToast('Скарбничку успішно оновлено!', 'info');
    document.getElementById('goal-form').reset();
    updateGoalUI();
});

document.getElementById('delete-goal-btn').addEventListener('click', function() {
    goal = null;
    localStorage.removeItem('fb_goal');
    showToast('Ціль успішно скасовано', 'error');
    updateGoalUI();
});

function updateGoalUI() {
    const emptyState = document.getElementById('empty-goal-state');
    const activeState = document.getElementById('active-goal-state');

    if (!goal) {
        emptyState.style.display = 'block';
        activeState.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        activeState.style.display = 'block';

        document.getElementById('display-goal-name').textContent = goal.name;
        document.getElementById('display-goal-amount').textContent = `₴${formatMoney(goal.amount)}`;

        const balance = calculateBalance();
        const saved = balance > 0 ? balance : 0; 
        
        let percent = (saved / goal.amount) * 100;
        if (percent > 100) percent = 100;
        if (percent < 0) percent = 0;

        const remaining = goal.amount - saved;

        document.getElementById('goal-progress-percent').textContent = `${Math.floor(percent)}%`;
        document.getElementById('goal-progress-bar').style.width = `${percent}%`;
        document.getElementById('goal-remaining').textContent = `₴${formatMoney(remaining > 0 ? remaining : 0)}`;
    }
}

document.getElementById('transaction-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('t-name').value;
    const amount = parseFloat(document.getElementById('t-amount').value);
    const categoryVal = document.getElementById('t-category').value;
    
    const isIncome = ['salary', 'other_income'].includes(categoryVal);
    const type = isIncome ? 'income' : 'expense';

    const newTransaction = {
        id: Date.now(),
        name,
        amount,
        type,
        category: categoryVal,
        date: new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' })
    };

    transactions.unshift(newTransaction);
    localStorage.setItem('fb_transactions', JSON.stringify(transactions));

    showToast('Транзакцію успішно додано!', 'success');
    document.getElementById('t-name').value = '';
    document.getElementById('t-amount').value = '';
    
    updateTransactionsUI();
    updateGoalUI();
});

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem('fb_transactions', JSON.stringify(transactions));
    showToast('Транзакцію видалено', 'error');
    updateTransactionsUI();
    updateGoalUI(); 
}

function calculateBalance() {
    return transactions.reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);
}

function initChart() {
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = 'sans-serif';

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderWidth: 0 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' } },
                tooltip: {
                    backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#f8fafc',
                    borderColor: '#334155', borderWidth: 1, padding: 12,
                    callbacks: { label: function(context) { return ` ₴${formatMoney(context.raw)}`; } }
                }
            }
        }
    });
}

function updateChartData() {
    const expensesByCategory = {};
    let totalExpense = 0;

    transactions.forEach(t => {
        if (t.type === 'expense') {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
            totalExpense += t.amount;
        }
    });

    const emptyMsg = document.getElementById('empty-chart-msg');
    
    if (totalExpense === 0) {
        expenseChart.data.labels = [];
        expenseChart.data.datasets[0].data = [];
        emptyMsg.classList.remove('hidden');
    } else {
        emptyMsg.classList.add('hidden');
        const labels = Object.keys(expensesByCategory).map(k => categoryNames[k]);
        const data = Object.values(expensesByCategory);
        const bgColors = Object.keys(expensesByCategory).map(k => categoryColors[k]);

        expenseChart.data.labels = labels;
        expenseChart.data.datasets[0].data = data;
        expenseChart.data.datasets[0].backgroundColor = bgColors;
    }
    
    expenseChart.update();
}

function updateTransactionsUI() {
    const list = document.getElementById('transactions-list');
    let income = 0;
    let expense = 0;

    list.innerHTML = '';

    if (transactions.length === 0) {
        list.innerHTML = '<div class="text-slate-500 text-center py-8">Тут поки порожньо.<br>Додайте першу транзакцію вище.</div>';
    } else {
        transactions.forEach(t => {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;

            const isIncome = t.type === 'income';
            const sign = isIncome ? '+' : '-';
            const colorClass = isIncome ? 'text-emerald-400' : 'text-slate-200';
            const iconBg = isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-300';
            const categoryName = categoryNames[t.category] || 'Інше';

            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-3 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all group';
            div.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center ${iconBg} shrink-0">
                        <i class="fas ${isIncome ? 'fa-arrow-down' : 'fa-receipt'}"></i>
                    </div>
                    <div class="overflow-hidden">
                        <div class="font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">${t.name}</div>
                        <div class="text-xs text-slate-400 flex gap-2">
                            <span>${categoryName}</span> • <span>${t.date}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-4 shrink-0">
                    <div class="font-bold ${colorClass} text-right">${sign}₴${formatMoney(t.amount)}</div>
                    <button onclick="deleteTransaction(${t.id})" class="text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-2">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
    }

    const balance = income - expense;
    document.getElementById('total-balance').textContent = `₴${formatMoney(balance)}`;
    document.getElementById('total-income').textContent = `+₴${formatMoney(income)}`;
    document.getElementById('total-expense').textContent = `-₴${formatMoney(expense)}`;
    
    updateChartData();
}

init();
