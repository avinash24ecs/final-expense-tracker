# Ledger — Expense Tracker

A **full-featured, frontend-only** expense tracker built with vanilla HTML, CSS, and JavaScript. All data is stored in `localStorage` — no backend, no database required.

## ✨ Features

| Feature | Details |
|---|---|
| 💱 **20 Currencies** | USD, EUR, GBP, INR, JPY, CAD, AUD, CHF, CNY, SGD, AED, SAR, BRL, MXN, KRW, RUB, ZAR, SEK, NOK, DKK |
| 🌙 **Dark Mode** | Toggle with one click, persisted in localStorage |
| ➕ **Add Expense** | Description, amount, date, category, optional notes |
| ✏️ **Edit Expense** | Full edit via modal dialog |
| 🗑️ **Delete Expense** | With confirmation prompt |
| 📂 **Custom Categories** | Add or remove your own categories |
| 💰 **Monthly Budgets** | Set budget per category with progress bars (green → amber → red) |
| 📊 **Charts** | Doughnut (by category) + Bar (6-month trend) |
| 🔍 **Search & Filter** | Live search + category filter + sort (date/amount) |
| 📄 **Pagination** | 10 expenses per page |
| ⬇️ **CSV Export** | Export filtered month's expenses to CSV |
| 📱 **Responsive** | Works on mobile, tablet, and desktop |

## 🚀 Live Demo

Deployed on Vercel: _your-url-here_

## 🏃 Run Locally

No build step needed — just open in a browser:

```bash
# Option 1: open directly
open public/index.html

# Option 2: use a simple server
npx serve public
# or
python -m http.server 8080 --directory public
```

## 📁 Project Structure

```
expense-tracker/
├── public/
│   ├── index.html   ← Main HTML
│   ├── style.css    ← All styles (light + dark theme)
│   └── script.js    ← Full app logic
├── vercel.json      ← Vercel deployment config
└── README.md
```

## ☁️ Deploy to Vercel

See deployment steps in the project documentation or run:

```bash
npx vercel --prod
```

## 🛠️ Tech Stack

- **HTML5** — semantic markup
- **CSS3** — CSS custom properties, grid, flexbox, dark mode
- **Vanilla JavaScript** — no frameworks, no bundler
- **Chart.js 4** — doughnut and bar charts
- **localStorage** — persistent data storage
- **Vercel** — static hosting
