import type { Account, FinanceData, Trade, Transaction, Budget, Period } from './types'
import { day } from './data'

export function amount(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'EUR', maximumFractionDigits: 2 }).format((Number.isFinite(cents) ? cents : 0) / 100)
}
export function shortAmount(cents: number, currency = 'EUR'): string {
  if (Math.abs(cents) < 10000000) return amount(cents, currency)
  const sign = cents < 0 ? '−' : ''
  return sign + new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(Math.abs(cents) / 100000) + 'k'
}
export function toCents(value: number | string): number { return Math.round(Number(value) * 100) }
export const inputAmount = (cents: number): string => (cents / 100).toFixed(2)
export const pct = (value: number): string => Number.isFinite(value) ? value.toFixed(1) + '%' : '—'
export const accountById = (d: FinanceData, id: string): Account | undefined => d.accounts.find(a => a.id === id)
export function converted(cents: number, currency: string, d: FinanceData): number {
  const rate = currency === d.settings.currency ? 1 : d.settings.rates[currency]
  return rate !== undefined && Number.isFinite(rate) && rate > 0 ? Math.round(cents * rate) : NaN
}
export function baseValue(cents: number, accountId: string, d: FinanceData): number {
  return converted(cents, accountById(d, accountId)?.currency || d.settings.currency, d)
}
export function validBase(cents: number): number { return Number.isFinite(cents) ? cents : 0 }
export function accountBalance(a: Account, d: FinanceData, through?: string): number {
  let balance = a.openingBalance
  for (const t of d.transactions) {
    if (t.status !== 'posted' || (through && t.date > through)) continue
    if (t.type === 'transfer') {
      if (t.accountId === a.id) balance -= t.amount
      if (t.targetAccountId === a.id) balance += t.targetAmount ?? t.amount
    } else if (t.accountId === a.id) {
      if (t.type === 'income') balance += t.amount
      if (t.type === 'expense') balance -= t.amount
      if (t.type === 'adjustment') balance += t.amount
    }
  }
  for (const t of d.trades) {
    if (t.accountId !== a.id || (through && t.date > through)) continue
    const cash = Math.round(t.quantity * t.price)
    balance += t.side === 'buy' ? -cash - t.fee : cash - t.fee
  }
  return balance
}
export function availableBalance(d: FinanceData): number {
  return d.accounts.filter(a => !a.archived && ['checking', 'cash', 'savings'].includes(a.type))
    .reduce((sum, a) => sum + validBase(converted(accountBalance(a, d), a.currency, d)), 0)
}
export type Holding = {
  key: string; symbol: string; name: string; assetType: Trade['assetType']; accountId: string;
  quantity: number; cost: number; avgPrice: number; price: number; value: number;
  unrealized: number; realized: number; currency: string; priceDate?: string
}
export function holdings(d: FinanceData): Holding[] {
  const groups = new Map<string, Holding>()
  const sorted = [...d.trades].sort((a, b) => a.date.localeCompare(b.date))
  for (const trade of sorted) {
    const key = trade.accountId + ':' + trade.symbol.toUpperCase()
    const account = accountById(d, trade.accountId)
    let h = groups.get(key)
    if (!h) {
      h = { key, symbol: trade.symbol.toUpperCase(), name: trade.name, assetType: trade.assetType,
        accountId: trade.accountId, quantity: 0, cost: 0, avgPrice: 0,
        price: trade.price, value: 0, unrealized: 0, realized: 0, currency: account?.currency || d.settings.currency }
      groups.set(key, h)
    }
    if (trade.side === 'buy') {
      h.cost += Math.round(trade.quantity * trade.price) + trade.fee
      h.quantity += trade.quantity
    } else {
      const soldCost = h.quantity > 0 ? Math.round((h.cost / h.quantity) * trade.quantity) : 0
      h.realized += Math.round(trade.quantity * trade.price) - trade.fee - soldCost
      h.cost -= soldCost
      h.quantity = Math.max(0, h.quantity - trade.quantity)
    }
    h.avgPrice = h.quantity > 0 ? h.cost / h.quantity : 0
    h.price = trade.price
  }
  for (const h of groups.values()) {
    const quote = d.prices[h.symbol]
    if (quote?.currency === h.currency) { h.price = quote.price; h.priceDate = quote.updatedAt }
    h.value = Math.round(h.quantity * h.price)
    h.unrealized = h.value - h.cost
  }
  return [...groups.values()].filter(h => h.quantity > 0.00000001)
}
export function portfolioValue(d: FinanceData): number {
  return holdings(d).reduce((s, h) => s + validBase(converted(h.value, h.currency, d)), 0)
}
export function netWorth(d: FinanceData): number {
  const balances = d.accounts.reduce((s, a) => s + validBase(converted(accountBalance(a, d), a.currency, d)), 0)
  const unlinkedDebt = d.debts.filter(debt => !debt.linkedAccountId).reduce((s, debt) => s + debt.principal, 0)
  return balances + portfolioValue(d) - unlinkedDebt
}
export function incomeExpense(d: FinanceData, start: string, end: string, type: 'income' | 'expense'): number {
  return d.transactions.filter(t => t.type === type && t.status === 'posted' && t.date >= start && t.date <= end)
    .reduce((s, t) => s + validBase(baseValue(t.amount, t.accountId, d)), 0)
}
export function dateBounds(selection: string, anchor = new Date()): [string, string] {
  const y = anchor.getFullYear(), m = anchor.getMonth()
  const iso = (x: Date) => x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0')
  if (selection === 'year') return [iso(new Date(y,0,1)), iso(new Date(y,11,31))]
  if (selection === '90d') return [iso(new Date(y,m,anchor.getDate()-89)), iso(anchor)]
  if (selection === 'all') return ['1900-01-01','9999-12-31']
  return [iso(new Date(y,m,1)), iso(new Date(y,m+1,0))]
}
export function periodBounds(period: Period, now = new Date()): [string, string] {
  const y = now.getFullYear(), m = now.getMonth(), dt = now.getDate()
  const iso = (x: Date) => x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0')
  if (period === 'yearly') return [iso(new Date(y,0,1)),iso(new Date(y,11,31))]
  if (period === 'weekly') {
    const monday = new Date(y,m,dt-(now.getDay()+6)%7)
    return [iso(monday), iso(new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+6))]
  }
  return dateBounds('month',now)
}
export function budgetSpent(b: Budget, d: FinanceData): number {
  const [start, end] = periodBounds(b.period)
  return d.transactions.filter(t => t.type === 'expense' && t.status === 'posted' && t.date >= start && t.date <= end)
    .reduce((s, t) => {
      if (b.category === 'All spending') return s + validBase(baseValue(t.amount,t.accountId,d))
      if (t.splits?.length) return s + t.splits.filter(split => split.category === b.category).reduce((part, split) => part + validBase(baseValue(split.amount,t.accountId,d)), 0)
      return s + (t.category === b.category ? validBase(baseValue(t.amount,t.accountId,d)) : 0)
    }, 0)
}
export function categorySpending(d: FinanceData, start: string, end: string): {name:string;value:number}[] {
  const sums = new Map<string,number>()
  for (const t of d.transactions) {
    if (t.type !== 'expense' || t.status !== 'posted' || t.date < start || t.date > end) continue
    for (const p of (t.splits?.length ? t.splits : [{category:t.category,amount:t.amount}])) {
      sums.set(p.category,(sums.get(p.category) || 0) + validBase(baseValue(p.amount,t.accountId,d)))
    }
  }
  return [...sums].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value)
}
export function monthSeries(d: FinanceData, count = 7) {
  const now = new Date()
  return Array.from({length: count}, (_, i) => {
    const x = new Date(now.getFullYear(),now.getMonth() - count + i + 1,1)
    const [start,end] = dateBounds('month',x)
    return {name:x.toLocaleDateString('en-US',{month:'short'}),key:start.slice(0,7),
      income:incomeExpense(d,start,end,'income')/100,expenses:incomeExpense(d,start,end,'expense')/100}
  })
}
export function monthlyStats(d: FinanceData) {
  const [start,end] = dateBounds('month')
  const income = incomeExpense(d,start,end,'income')
  const expenses = incomeExpense(d,start,end,'expense')
  const prev = new Date(new Date().getFullYear(),new Date().getMonth()-1,1)
  const [ps,pe] = dateBounds('month',prev)
  return { income, expenses, profit:income-expenses,
    savingsRate:income ? (income-expenses)/income*100 : 0,
    previousIncome:incomeExpense(d,ps,pe,'income'),previousExpenses:incomeExpense(d,ps,pe,'expense') }
}
export function nextBillDate(iso: string, interval: 'weekly'|'monthly'|'yearly'|'once'): string {
  if (interval === 'once') return iso
  const [y,m,dayNum] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y,m-1,dayNum))
  if (interval === 'weekly') date.setUTCDate(date.getUTCDate()+7)
  if (interval !== 'weekly') {
    const newMonth = m - 1 + (interval === 'monthly' ? 1 : 12)
    const first = new Date(Date.UTC(y,newMonth,1))
    const lastDay = new Date(Date.UTC(y,newMonth+1,0)).getUTCDate()
    first.setUTCDate(Math.min(dayNum,lastDay))
    return first.toISOString().slice(0,10)
  }
  return date.toISOString().slice(0,10)
}
export function amortization(principal: number, apr: number, payment: number) {
  let balance = principal, interest = 0, months = 0
  while (balance > 0 && months < 1200) {
    const charge = Math.round(balance * apr / 1200)
    if (payment <= charge) return { months: Infinity, interest: Infinity }
    interest += charge
    balance = Math.max(0,balance + charge - payment)
    months++
  }
  return {months,interest}
}
export function forecast(d: FinanceData, months = 12, monthlyAdjustment = 0, annualGrowth = 0) {
  const series = monthSeries(d,6)
  const recent = series.slice(-3)
  const average = recent.reduce((s,x)=>s+x.income-x.expenses,0)/Math.max(1,recent.length)*100 + monthlyAdjustment
  const start = netWorth(d)
  return Array.from({length:months+1},(_,i)=>{
    const value = Math.round(start * Math.pow(1+annualGrowth/1200,i) + average * i)
    return {name:i===0?'Now':'M'+i, value:value/100, index:i}
  })
}
export function countAlerts(d: FinanceData): number {
  return d.bills.filter(b=>b.status==='active' && b.nextDate <= day()).length +
    d.budgets.filter(b=>budgetSpent(b,d)>b.amount).length +
    d.accounts.filter(a=>!a.archived && ['checking','cash','savings'].includes(a.type) && accountBalance(a,d)<0).length
}
export function csvCell(value: unknown): string {
  const str = String(value ?? '')
  return /[",\r\n]/.test(str) ? '"' + str.replace(/"/g,'""') + '"' : str
}
export function csvTable(headers:string[],rows:(string|number|undefined)[][]):string {
  return [headers.join(','), ...rows.map(r=>r.map(csvCell).join(','))].join('\r\n')
}
export function parseCsv(input: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false
  for (let i=0;i<input.length;i++) {
    const c=input[i]
    if (c==='"') {
      if (quoted && input[i+1]==='"') {field+='"';i++}
      else quoted=!quoted
    } else if (c===',' && !quoted) {row.push(field);field=''}
    else if ((c==='\n'||c==='\r') && !quoted) {
      if(c==='\r' && input[i+1]==='\n') i++
      row.push(field);if(row.some(x=>x.trim())) rows.push(row)
      row=[];field=''
    } else field+=c
  }
  row.push(field); if(row.some(x=>x.trim())) rows.push(row)
  return rows
}
export function transactionCsv(d:FinanceData):string {
  return csvTable(['date','type','amount','currency','account','category','merchant','note','status','tags'],
    d.transactions.map(t=>[t.date,t.type,(t.amount/100).toFixed(2),accountById(d,t.accountId)?.currency||d.settings.currency,
      accountById(d,t.accountId)?.name||'',t.category,t.merchant,t.note,t.status,t.tags.join(';')]))
}
