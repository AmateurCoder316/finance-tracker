export type AccountType = 'checking' | 'cash' | 'savings' | 'investment' | 'credit' | 'loan' | 'crypto' | 'other'
export type TransactionType = 'income' | 'expense' | 'transfer' | 'adjustment'
export type Period = 'weekly' | 'monthly' | 'yearly'
export type Currency = string

export interface Account {
  id: string; name: string; type: AccountType; currency: Currency
  openingBalance: number; group?: string; archived?: boolean; createdAt: string
}
export interface Split { category: string; amount: number }
export interface Transaction {
  id: string; type: TransactionType; accountId: string; amount: number
  targetAccountId?: string; targetAmount?: number; category: string
  date: string; merchant: string; note: string; tags: string[]
  status: 'posted' | 'pending'; splits?: Split[]; method?: string; createdAt: string
}
export interface Budget {
  id: string; name: string; category: string; amount: number; period: Period
  rollover?: boolean; createdAt: string
}
export interface Goal {
  id: string; name: string; target: number; saved: number; deadline: string
  priority: 'low' | 'medium' | 'high'; archived?: boolean
  contributions: { id: string; date: string; amount: number }[]
}
export interface Trade {
  id: string; symbol: string; name: string; assetType: 'stock' | 'etf' | 'fund' | 'crypto' | 'other'
  side: 'buy' | 'sell'; quantity: number; price: number; fee: number
  accountId: string; date: string
}
export interface MarketPrice { price: number; currency: string; updatedAt: string }
export interface Bill {
  id: string; name: string; amount: number; nextDate: string; interval: 'weekly' | 'monthly' | 'yearly' | 'once'
  category: string; accountId: string; status: 'active' | 'cancelled'
  payments: string[]; trialEnds?: string; note?: string
}
export interface Debt {
  id: string; name: string; principal: number; apr: number; payment: number
  linkedAccountId?: string; dueDay?: number
}
export interface Invoice {
  id: string; number: string; client: string; description: string; amount: number
  issued: string; due: string; status: 'draft' | 'sent' | 'paid'; paidOn?: string
}
export interface Snapshot { date: string; value: number }
export interface Settings {
  currency: string; theme: 'light' | 'dark' | 'system'; accent: string
  rates: Record<string, number>; privacy: boolean; notifications: boolean
  taxRate: number; dashboardWidgets: string[]; monthStart: number
}
export interface FinanceData {
  version: 1; revision: number; demo: boolean
  accounts: Account[]; transactions: Transaction[]; budgets: Budget[]
  goals: Goal[]; trades: Trade[]; prices: Record<string, MarketPrice>
  bills: Bill[]; debts: Debt[]; invoices: Invoice[]
  categories: string[]; snapshots: Snapshot[]; settings: Settings
}
export interface DesktopAPI {
  load(): Promise<FinanceData | null>
  save(data: FinanceData): Promise<boolean>
  openFile(): Promise<{ name: string; content: string } | null>
  saveFile(name: string, content: string, filters?: { name: string; extensions: string[] }[]): Promise<boolean>
  exportPdf(name: string): Promise<boolean>
  notify(title: string, body: string): Promise<void>
}
declare global { interface Window { finance?: DesktopAPI } }
