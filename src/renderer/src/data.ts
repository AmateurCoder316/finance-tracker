import type { FinanceData } from './types'

export const uid = () => crypto.randomUUID()
export const day = () => { const x = new Date(); return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0') }
export const DEFAULT_CATEGORIES = ['Housing', 'Food & groceries', 'Restaurants', 'Shopping', 'Transport', 'Health', 'Entertainment', 'Education', 'Utilities', 'Subscriptions', 'Travel', 'Insurance', 'Taxes', 'Business', 'Salary', 'Freelance', 'Investment income', 'Gifts', 'Other']

export function blankData(): FinanceData {
  return {
    version: 1, revision: 0, demo: false,
    accounts: [], transactions: [], budgets: [], goals: [], trades: [],
    prices: {}, bills: [], debts: [], invoices: [], categories: [...DEFAULT_CATEGORIES], snapshots: [],
    settings: {
      currency: 'EUR', theme: 'system', accent: '#5269d5', rates: { EUR: 1 },
      privacy: false, notifications: true, taxRate: 0,
      dashboardWidgets: ['cashflow', 'spending', 'accounts', 'goals', 'bills', 'investments'],
      monthStart: 1
    }
  }
}
export function demoData(): FinanceData {
  const d = blankData()
  const now = new Date()
  const dateInMonth = (offset: number, date: number) => {
    const x = new Date(now.getFullYear(), now.getMonth() + offset, Math.min(date, 28), 12)
    return x.toISOString().slice(0, 10)
  }
  d.demo = true
  d.accounts = [
    { id: 'bank', name: 'Everyday account', type: 'checking', currency: 'EUR', openingBalance: 125000, group: 'Personal', createdAt: dateInMonth(-6, 1) },
    { id: 'savings', name: 'High yield savings', type: 'savings', currency: 'EUR', openingBalance: 750000, group: 'Personal', createdAt: dateInMonth(-6, 1) },
    { id: 'cash', name: 'Cash wallet', type: 'cash', currency: 'EUR', openingBalance: 12000, group: 'Personal', createdAt: dateInMonth(-6, 1) },
    { id: 'brokerage', name: 'Investing', type: 'investment', currency: 'EUR', openingBalance: 400000, group: 'Investments', createdAt: dateInMonth(-6, 1) },
    { id: 'credit', name: 'Credit card', type: 'credit', currency: 'EUR', openingBalance: -28500, group: 'Personal', createdAt: dateInMonth(-6, 1) }
  ]
  const tx = (id: string, kind: 'income'|'expense', amount: number, category: string, merchant: string, offset: number, dt: number, accountId = 'bank') => ({
    id, type: kind, amount, category, merchant, accountId, date: dateInMonth(offset, dt),
    note: '', tags: [], status: 'posted' as const, createdAt: dateInMonth(offset, dt)
  })
  d.transactions = []
  for (let m = -5; m <= 0; m++) {
    d.transactions.push(tx('salary'+m, 'income', 315000 + (m === 0 ? 12000 : 0), 'Salary', 'Acme Studio', m, 2))
    d.transactions.push(tx('rent'+m, 'expense', 95000, 'Housing', 'Monthly rent', m, 3))
    d.transactions.push(tx('grocery'+m, 'expense', 38000 + (m+5)*1100, 'Food & groceries', 'Whole Foods', m, 9))
    d.transactions.push(tx('cafe'+m, 'expense', 12500, 'Restaurants', 'Local coffee & dining', m, 14))
    d.transactions.push(tx('transit'+m, 'expense', 7500, 'Transport', 'Transit pass', m, 5))
    d.transactions.push(tx('subscriptions'+m, 'expense', 2700, 'Subscriptions', 'Streaming bundle', m, 18))
    d.transactions.push(tx('utilities'+m, 'expense', 10500, 'Utilities', 'Electricity and internet', m, 22))
    d.transactions.push(tx('freelance'+m, 'income', 52000 + (m+5)*3500, 'Freelance', 'Design project', m, 24))
  }
  d.budgets = [
    { id: 'b1', name: 'Food & groceries', category: 'Food & groceries', amount: 50000, period: 'monthly', createdAt: day() },
    { id: 'b2', name: 'Shopping', category: 'Shopping', amount: 30000, period: 'monthly', createdAt: day() },
    { id: 'b3', name: 'Restaurants', category: 'Restaurants', amount: 20000, period: 'monthly', createdAt: day() },
    { id: 'b4', name: 'Transport', category: 'Transport', amount: 15000, period: 'monthly', createdAt: day() }
  ]
  d.goals = [
    { id: 'g1', name: 'Emergency fund', target: 1000000, saved: 750000, deadline: dateInMonth(9, 1), priority: 'high', contributions: [] },
    { id: 'g2', name: 'Summer holiday', target: 250000, saved: 95000, deadline: dateInMonth(7, 1), priority: 'medium', contributions: [] },
    { id: 'g3', name: 'New laptop', target: 180000, saved: 63000, deadline: dateInMonth(5, 1), priority: 'low', contributions: [] }
  ]
  d.trades = [
    { id: 't1', symbol: 'AAPL', name: 'Apple Inc.', assetType: 'stock', side: 'buy', quantity: 8, price: 15500, fee: 250, accountId: 'brokerage', date: dateInMonth(-3, 12) },
    { id: 't2', symbol: 'VWCE', name: 'FTSE All-World ETF', assetType: 'etf', side: 'buy', quantity: 14, price: 10800, fee: 300, accountId: 'brokerage', date: dateInMonth(-2, 7) }
  ]
  d.prices = {
    AAPL: { price: 17200, currency: 'EUR', updatedAt: day() },
    VWCE: { price: 11700, currency: 'EUR', updatedAt: day() }
  }
  d.bills = [
    { id: 'bill1', name: 'Internet', amount: 3990, nextDate: dateInMonth(0, 23), interval: 'monthly', category: 'Utilities', accountId: 'bank', status: 'active', payments: [] },
    { id: 'bill2', name: 'Netflix', amount: 1299, nextDate: dateInMonth(0, 26), interval: 'monthly', category: 'Subscriptions', accountId: 'bank', status: 'active', payments: [] },
    { id: 'bill3', name: 'Car insurance', amount: 24500, nextDate: dateInMonth(1, 15), interval: 'yearly', category: 'Insurance', accountId: 'bank', status: 'active', payments: [] }
  ]
  d.debts = [{ id: 'debt1', name: 'Student loan', principal: 620000, apr: 3.5, payment: 22000 }]
  d.invoices = [{ id: 'inv1', number: 'INV-001', client: 'North Studio', description: 'Website project', amount: 98000, issued: dateInMonth(0, 5), due: dateInMonth(1, 5), status: 'sent' }]
  return d
}
