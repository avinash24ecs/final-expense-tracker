/* =============================================================
   LEDGER — Expense Tracker  |  Pure Frontend (localStorage)
   Features: multi-currency, dark mode, edit, search, sort,
             pagination, CSV export, budget alerts, charts
   ============================================================= */

// ──────────────────────────────────────────────
// CURRENCY CONFIG
// ──────────────────────────────────────────────
const CURRENCIES = {
  USD: { symbol: '$',  name: 'US Dollar',         decimals: 2 },
  EUR: { symbol: '€',  name: 'Euro',               decimals: 2 },
  GBP: { symbol: '£',  name: 'British Pound',      decimals: 2 },
  INR: { symbol: '₹',  name: 'Indian Rupee',       decimals: 2 },
  JPY: { symbol: '¥',  name: 'Japanese Yen',       decimals: 0 },
  CAD: { symbol: 'C$', name: 'Canadian Dollar',    decimals: 2 },
  AUD: { symbol: 'A$', name: 'Australian Dollar',  decimals: 2 },
  CHF: { symbol: '₣',  name: 'Swiss Franc',        decimals: 2 },
  CNY: { symbol: '¥',  name: 'Chinese Yuan',       decimals: 2 },
  SGD: { symbol: 'S$', name: 'Singapore Dollar',   decimals: 2 },
  AED: { symbol: 'د.إ', name: 'UAE Dirham',        decimals: 2 },
  SAR: { symbol: '﷼',  name: 'Saudi Riyal',        decimals: 2 },
  BRL: { symbol: 'R$', name: 'Brazilian Real',     decimals: 2 },
  MXN: { symbol: '$',  name: 'Mexican Peso',       decimals: 2 },
  KRW: { symbol: '₩',  name: 'South Korean Won',   decimals: 0 },
  RUB: { symbol: '₽',  name: 'Russian Ruble',      decimals: 2 },
  ZAR: { symbol: 'R',  name: 'South African Rand', decimals: 2 },
  SEK: { symbol: 'kr', name: 'Swedish Krona',      decimals: 2 },
  NOK: { symbol: 'kr', name: 'Norwegian Krone',    decimals: 2 },
  DKK: { symbol: 'kr', name: 'Danish Krone',       decimals: 2 },
};

const DEFAULT_CATEGORIES = [
  'Food & Dining', 'Transport', 'Housing', 'Utilities',
  'Healthcare', 'Shopping', 'Entertainment', 'Education',
  'Travel', 'Personal Care', 'Savings', 'Other',
];

const PAGE_SIZE = 10;

// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────
let state = {
  expenses:   [],   // { id, description, amount, category, date, notes }
  budgets:    {},   // { [category]: limit }
  categories: [],
  currency:   'USD',
  theme:      'light',
  page:       1,
  activeChart: 'doughnut',
};

// ──────────────────────────────────────────────
// PERSISTENCE
// ──────────────────────────────────────────────
function save() {
  localStorage.setItem('ledger_expenses',   JSON.stringify(state.expenses));
  localStorage.setItem('ledger_budgets',    JSON.stringify(state.budgets));
  localStorage.setItem('ledger_categories', JSON.stringify(state.categories));
  localStorage.setItem('ledger_currency',   state.currency);
  localStorage.setItem('ledger_theme',      state.theme);
}

function load() {
  state.expenses   = JSON.parse(localStorage.getItem('ledger_expenses')   || '[]');
  state.budgets    = JSON.parse(localStorage.getItem('ledger_budgets')    || '{}');
  state.categories = JSON.parse(localStorage.getItem('ledger_categories') || 'null')
                     || [...DEFAULT_CATEGORIES];
  state.currency   = localStorage.getItem('ledger_currency') || 'USD';
  state.theme      = localStorage.getItem('ledger_theme')    || 'light';
}

// ──────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────
function money(n) {
  const cur = CURRENCIES[state.currency] || CURRENCIES.USD;
  const formatted = Number(n).toLocaleString(undefined, {
    minimumFractionDigits: cur.decimals,
    maximumFractionDigits: cur.decimals,
  });
  return `${cur.symbol}${formatted}`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

let toastTimer = null;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ──────────────────────────────────────────────
// DOM REFS
// ──────────────────────────────────────────────
const $ = id => document.getElementById(id);
const monthInput     = $('month-select');
const currencySelect = $('currency-select');
const form           = $('expense-form');
const filterCat      = $('filter-category');
const sortSelect     = $('sort-select');
const searchInput    = $('search-input');
const rowsEl         = $('expense-rows');
const listEmpty      = $('list-empty');
const totalSpentEl   = $('total-spent');
const totalRemEl     = $('total-remaining');
const totalCountEl   = $('total-count');
const dailyAvgEl     = $('daily-avg');
const budgetListEl   = $('budget-list');
const paginationEl   = $('pagination');
const editModal      = $('edit-modal');
const editForm       = $('edit-form');
const submitBtn      = $('submit-btn');
let   doughnutChart  = null;
let   barChart       = null;

// ──────────────────────────────────────────────
// CATEGORIES
// ──────────────────────────────────────────────
function populateCategorySelects() {
  const cats = state.categories;
  const opts = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

  $('category').innerHTML     = opts;
  $('edit-category').innerHTML = opts;
  filterCat.innerHTML =
    '<option value="All">All categories</option>' + opts;
}

function addCustomCategory() {
  const input = $('new-category');
  const name  = input.value.trim();
  if (!name) return;
  if (state.categories.includes(name)) {
    showToast('Category already exists', 'error');
    return;
  }
  state.categories.push(name);
  save();
  populateCategorySelects();
  input.value = '';
  showToast(`Category "${name}" added`);
}

// ──────────────────────────────────────────────
// EXPENSES — CRUD
// ──────────────────────────────────────────────
function addExpense({ description, amount, category, date, notes }) {
  const expense = {
    id: uid(),
    description: description.trim(),
    amount:      parseFloat(amount),
    category,
    date,
    notes: (notes || '').trim(),
  };
  state.expenses.unshift(expense);
  save();
  return expense;
}

function deleteExpense(id) {
  state.expenses = state.expenses.filter(e => e.id !== id);
  save();
}

function updateExpense(id, { description, amount, category, date, notes }) {
  const idx = state.expenses.findIndex(e => e.id === id);
  if (idx === -1) return false;
  state.expenses[idx] = {
    ...state.expenses[idx],
    description: description.trim(),
    amount:      parseFloat(amount),
    category,
    date,
    notes: (notes || '').trim(),
  };
  save();
  return true;
}

// ──────────────────────────────────────────────
// FILTERED / SORTED EXPENSES
// ──────────────────────────────────────────────
function getFiltered() {
  const month    = monthInput.value;
  const catFilter = filterCat.value;
  const q        = searchInput.value.trim().toLowerCase();
  const sort     = sortSelect.value;

  let list = state.expenses.filter(e => {
    if (e.date.slice(0, 7) !== month) return false;
    if (catFilter !== 'All' && e.category !== catFilter) return false;
    if (q && !e.description.toLowerCase().includes(q) &&
            !e.category.toLowerCase().includes(q)     &&
            !(e.notes || '').toLowerCase().includes(q)) return false;
    return true;
  });

  list.sort((a, b) => {
    switch (sort) {
      case 'date-desc':   return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
      case 'date-asc':    return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
      case 'amount-desc': return b.amount - a.amount;
      case 'amount-asc':  return a.amount - b.amount;
      default:            return 0;
    }
  });

  return list;
}

// ──────────────────────────────────────────────
// RENDER — EXPENSE TABLE
// ──────────────────────────────────────────────
function renderExpenses() {
  const all      = getFiltered();
  const total    = all.length;
  const pages    = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (state.page > pages) state.page = pages;

  const slice = all.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

  totalCountEl.textContent = total;

  const spent = all.reduce((s, e) => s + e.amount, 0);
  totalSpentEl.textContent = money(spent);

  // Daily average (days elapsed in month)
  const [y, m] = monthInput.value.split('-').map(Number);
  const today  = new Date();
  const daysElapsed = (today.getFullYear() === y && today.getMonth() + 1 === m)
    ? today.getDate()
    : new Date(y, m, 0).getDate(); // last day of month
  dailyAvgEl.textContent = total ? money(spent / daysElapsed) : '—';

  // Remaining budget (sum of all budgeted categories)
  const totalBudget = state.categories.reduce((s, c) => s + (state.budgets[c] || 0), 0);
  if (totalBudget > 0) {
    const rem = totalBudget - spent;
    totalRemEl.textContent = money(Math.abs(rem));
    totalRemEl.className   = `total-value ${rem < 0 ? 'over' : 'ok'}`;
  } else {
    totalRemEl.textContent = '—';
    totalRemEl.className   = 'total-value';
  }

  // Table rows
  if (slice.length === 0) {
    rowsEl.innerHTML = '';
    listEmpty.classList.add('show');
  } else {
    listEmpty.classList.remove('show');
    rowsEl.innerHTML = slice.map(e => `
      <tr data-id="${e.id}">
        <td>${formatDate(e.date)}</td>
        <td>${escapeHtml(e.description)}</td>
        <td><span class="cat-tag">${escapeHtml(e.category)}</span></td>
        <td class="notes-cell" title="${escapeHtml(e.notes || '')}">${escapeHtml(e.notes || '')}</td>
        <td class="align-right">${money(e.amount)}</td>
        <td>
          <div class="action-cell">
            <button class="edit-btn"   aria-label="Edit">✏️</button>
            <button class="delete-btn" aria-label="Delete">🗑</button>
          </div>
        </td>
      </tr>`).join('');

    rowsEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('tr').dataset.id;
        if (!confirm('Delete this expense?')) return;
        deleteExpense(id);
        showToast('Expense deleted', 'error');
        refresh();
      });
    });

    rowsEl.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('tr').dataset.id;
        openEditModal(id);
      });
    });
  }

  renderPagination(pages);
}

// ──────────────────────────────────────────────
// RENDER — PAGINATION
// ──────────────────────────────────────────────
function renderPagination(pages) {
  if (pages <= 1) { paginationEl.innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn${i === state.page ? ' active' : ''}" data-page="${i}">${i}</button>`;
  }
  paginationEl.innerHTML = html;
  paginationEl.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.page = parseInt(btn.dataset.page);
      renderExpenses();
    });
  });
}

// ──────────────────────────────────────────────
// RENDER — BUDGETS
// ──────────────────────────────────────────────
function renderBudgets(spentByCategory) {
  budgetListEl.innerHTML = state.categories.map(cat => {
    const limit = state.budgets[cat] || 0;
    const spent = spentByCategory[cat] || 0;
    const pct   = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
    const over  = limit > 0 && spent > limit;
    const warn  = !over && limit > 0 && pct >= 80;
    return `
      <div class="budget-row" data-category="${escapeHtml(cat)}">
        <div class="budget-top">
          <span class="budget-cat">${escapeHtml(cat)}</span>
          <div class="budget-controls">
            <input type="number" min="0" step="1" class="budget-input" value="${limit}" aria-label="Budget for ${escapeHtml(cat)}">
            <button class="budget-remove" aria-label="Remove category">✕</button>
          </div>
        </div>
        <div class="budget-bar-track">
          <div class="budget-bar-fill${over ? ' over' : warn ? ' warn' : ''}" style="width:${pct}%"></div>
        </div>
        <div class="budget-spent-text">${money(spent)} ${limit > 0 ? `of ${money(limit)}` : '(no limit)'}</div>
      </div>`;
  }).join('');

  budgetListEl.querySelectorAll('.budget-input').forEach(input => {
    input.addEventListener('change', () => {
      const cat = input.closest('.budget-row').dataset.category;
      state.budgets[cat] = Math.max(0, Number(input.value));
      save();
      refresh();
    });
  });

  budgetListEl.querySelectorAll('.budget-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.closest('.budget-row').dataset.category;
      if (!confirm(`Remove category "${cat}"? All expenses in this category will keep the category name.`)) return;
      state.categories = state.categories.filter(c => c !== cat);
      delete state.budgets[cat];
      save();
      populateCategorySelects();
      refresh();
      showToast(`Category "${cat}" removed`);
    });
  });
}

// ──────────────────────────────────────────────
// RENDER — CHARTS
// ──────────────────────────────────────────────
const PALETTE = [
  '#2F6F4E','#6E8F5C','#A9BF8E','#B3492F','#D6906B',
  '#8C9F8C','#4A7C96','#7BA3B5','#C89A2B','#E8C56D',
  '#7C4A96','#B57CC8',
];

function getSpentByCategory() {
  const month = monthInput.value;
  const map   = {};
  state.expenses
    .filter(e => e.date.slice(0, 7) === month)
    .forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
  return map;
}

function renderDoughnut(spentByCategory) {
  const canvas  = $('category-chart');
  const entries = Object.entries(spentByCategory).filter(([, v]) => v > 0);
  const wrap    = document.getElementById('chart-wrap');

  $('trend-chart').classList.add('hidden');
  canvas.classList.remove('hidden');

  if (entries.length === 0) {
    wrap.classList.add('empty');
    if (doughnutChart) { doughnutChart.destroy(); doughnutChart = null; }
    return;
  }
  wrap.classList.remove('empty');

  if (doughnutChart) doughnutChart.destroy();
  doughnutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels:   entries.map(([cat]) => cat),
      datasets: [{
        data:            entries.map(([, v]) => v),
        backgroundColor: entries.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth:     2,
        borderColor:     getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),
      }],
    },
    options: {
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font:      { family: 'IBM Plex Sans', size: 11 },
            color:     getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),
            boxWidth:  12,
            padding:   10,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${money(ctx.raw)} (${((ctx.raw / Object.values(spentByCategory).reduce((a,b)=>a+b,0))*100).toFixed(1)}%)`,
          },
        },
      },
    },
  });
}

function renderBarChart() {
  const canvas = $('trend-chart');
  $('category-chart').classList.add('hidden');
  canvas.classList.remove('hidden');
  document.getElementById('chart-wrap').classList.remove('empty');
  $('chart-empty').style.display = 'none';

  // Last 6 months
  const months = [];
  const now    = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const totals = months.map(m =>
    state.expenses
      .filter(e => e.date.slice(0, 7) === m)
      .reduce((s, e) => s + e.amount, 0)
  );

  const shortLabels = months.map(m => {
    const [y, mo] = m.split('-');
    return new Date(y, mo - 1).toLocaleString('default', { month: 'short' });
  });

  if (barChart) barChart.destroy();
  barChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels:   shortLabels,
      datasets: [{
        label:           'Total Spent',
        data:            totals,
        backgroundColor: PALETTE[0],
        borderRadius:    4,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${money(ctx.raw)}` },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: v => money(v),
            color:    getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim(),
          },
          grid: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--border').trim(),
          },
        },
        x: {
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim(),
          },
          grid: { display: false },
        },
      },
    },
  });
}

// ──────────────────────────────────────────────
// EDIT MODAL
// ──────────────────────────────────────────────
function openEditModal(id) {
  const e = state.expenses.find(ex => ex.id === id);
  if (!e) return;
  $('edit-id').value          = e.id;
  $('edit-description').value = e.description;
  $('edit-amount').value      = e.amount;
  $('edit-date').value        = e.date;
  $('edit-notes').value       = e.notes || '';
  $('edit-category').value    = e.category;
  editModal.removeAttribute('hidden');
  $('edit-description').focus();
}

function closeEditModal() {
  editModal.setAttribute('hidden', '');
}

editForm.addEventListener('submit', e => {
  e.preventDefault();
  const id = $('edit-id').value;
  updateExpense(id, {
    description: $('edit-description').value,
    amount:      $('edit-amount').value,
    category:    $('edit-category').value,
    date:        $('edit-date').value,
    notes:       $('edit-notes').value,
  });
  closeEditModal();
  showToast('Expense updated');
  refresh();
});

$('cancel-edit').addEventListener('click', closeEditModal);
editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeEditModal(); });

// ──────────────────────────────────────────────
// CSV EXPORT
// ──────────────────────────────────────────────
function exportCSV() {
  const month = monthInput.value;
  const rows  = state.expenses.filter(e => e.date.slice(0, 7) === month);
  if (!rows.length) { showToast('No expenses to export', 'error'); return; }

  const cur = state.currency;
  const headers = ['Date', 'Description', 'Category', 'Notes', `Amount (${cur})`];
  const csvRows = rows.map(e =>
    [e.date, `"${e.description.replace(/"/g, '""')}"`, e.category,
     `"${(e.notes || '').replace(/"/g, '""')}"`, e.amount].join(',')
  );

  const blob = new Blob([headers.join(',') + '\n' + csvRows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `expenses-${month}-${cur}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported ✓');
}

// ──────────────────────────────────────────────
// DARK MODE
// ──────────────────────────────────────────────
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $('theme-toggle').textContent = state.theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  save();
  // Redraw charts with new theme colors
  refresh();
}

// ──────────────────────────────────────────────
// REFRESH (main render cycle)
// ──────────────────────────────────────────────
function refresh() {
  const spentByCategory = getSpentByCategory();
  renderBudgets(spentByCategory);
  renderExpenses();
  if (state.activeChart === 'doughnut') {
    renderDoughnut(spentByCategory);
  } else {
    renderBarChart();
  }
}

// ──────────────────────────────────────────────
// EVENT LISTENERS
// ──────────────────────────────────────────────
form.addEventListener('submit', e => {
  e.preventDefault();
  const err = $('form-error');
  err.textContent = '';

  const description = $('description').value.trim();
  const amount      = parseFloat($('amount').value);
  const date        = $('date').value;
  const category    = $('category').value;
  const notes       = $('notes').value;

  if (!description) { err.textContent = 'Description is required.'; return; }
  if (isNaN(amount) || amount <= 0) { err.textContent = 'Amount must be a positive number.'; return; }
  if (!date) { err.textContent = 'Date is required.'; return; }

  submitBtn.disabled = true;
  addExpense({ description, amount, category, date, notes });
  form.reset();
  $('date').value = todayISO();
  submitBtn.disabled = false;
  showToast('Expense added ✓');

  if (date.slice(0, 7) === monthInput.value) {
    state.page = 1;
    refresh();
  }
});

currencySelect.addEventListener('change', () => {
  state.currency = currencySelect.value;
  save();
  refresh();
});

monthInput.addEventListener('change', () => { state.page = 1; refresh(); });
filterCat.addEventListener('change',  () => { state.page = 1; refresh(); });
sortSelect.addEventListener('change',  () => { state.page = 1; refresh(); });
searchInput.addEventListener('input',  () => { state.page = 1; renderExpenses(); });

$('export-csv').addEventListener('click', exportCSV);
$('theme-toggle').addEventListener('click', toggleTheme);

$('add-category-btn').addEventListener('click', addCustomCategory);
$('new-category').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); }
});

document.querySelectorAll('.chart-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.activeChart = tab.dataset.chart;
    refresh();
  });
});

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
(function init() {
  load();
  applyTheme();

  // Sync currency select
  currencySelect.value = state.currency;

  // Sync month
  monthInput.value = currentMonth();
  $('date').value  = todayISO();

  // Populate categories
  populateCategorySelects();

  // Initial render
  refresh();
})();
