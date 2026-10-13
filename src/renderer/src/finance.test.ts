import { describe, expect, it } from 'vitest'
import { blankData } from './data'
import { accountBalance, amortization, budgetSpent, holdings, incomeExpense, nextBillDate, netWorth, parseCsv, transactionCsv } from './finance'
import type { Account, Transaction } from './types'

const account:Account={id:'a',name:'Cash',type:'checking',currency:'EUR',openingBalance:10000,createdAt:'2026-01-01'}
const savings:Account={id:'b',name:'Savings',type:'savings',currency:'EUR',openingBalance:0,createdAt:'2026-01-01'}
const tx=(id:string,type:Transaction['type'],amount:number,accountId='a'):Transaction=>({
  id,type,amount,accountId,date:'2026-10-10',category:'Food & groceries',merchant:'Test',note:'',tags:[],status:'posted',createdAt:'2026-10-10'
})
describe('double-sided personal ledger',()=>{
  it('handles income, expenses and transfers without counting transfers as income',()=>{
    const d=blankData()
    d.accounts=[account,savings]
    d.transactions=[tx('i','income',5000),tx('e','expense',2000),{...tx('x','transfer',3000),targetAccountId:'b',targetAmount:3000}]
    expect(accountBalance(account,d)).toBe(10000)
    expect(accountBalance(savings,d)).toBe(3000)
    expect(incomeExpense(d,'2026-10-01','2026-10-31','income')).toBe(5000)
    expect(incomeExpense(d,'2026-10-01','2026-10-31','expense')).toBe(2000)
    expect(netWorth(d)).toBe(13000)
  })
  it('excludes pending entries and preserves manual adjustments',()=>{
    const d=blankData();d.accounts=[account]
    d.transactions=[{...tx('p','expense',2500),status:'pending'},tx('adj','adjustment',-500)]
    expect(accountBalance(account,d)).toBe(9500)
  })
  it('tracks trading as a change between cash and securities',()=>{
    const d=blankData();d.accounts=[account]
    d.trades=[{id:'t',accountId:'a',symbol:'ABC',name:'ABC',assetType:'stock',side:'buy',quantity:2,price:1000,fee:100,date:'2026-10-01'}]
    d.prices={ABC:{price:1200,currency:'EUR',updatedAt:'2026-10-13'}}
    expect(accountBalance(account,d)).toBe(7900)
    expect(holdings(d)[0].cost).toBe(2100)
    expect(holdings(d)[0].value).toBe(2400)
    expect(netWorth(d)).toBe(10300)
  })
  it('balances category splits',()=>{
    const d=blankData();d.accounts=[account]
    d.transactions=[{...tx('s','expense',1400),splits:[{category:'Shopping',amount:400},{category:'Food & groceries',amount:1000}]}]
    d.budgets=[{id:'b',name:'Food',category:'Food & groceries',amount:10000,period:'yearly',createdAt:'2026-01-01'}]
    expect(budgetSpent(d.budgets[0],d)).toBe(1000)
  })
  it('parses escaped CSV and exports a quoted merchant',()=>{
    expect(parseCsv('date,merchant\n2026-10-01,"Test, ""Inc"""')) .toEqual([['date','merchant'],['2026-10-01','Test, "Inc"']])
    const d=blankData();d.accounts=[account];d.transactions=[{...tx('q','expense',300),merchant:'A, B'}]
    expect(transactionCsv(d)).toContain('"A, B"')
  })
  it('advances end-of-month dates correctly',()=>{
    expect(nextBillDate('2026-01-31','monthly')).toBe('2026-02-28')
    expect(nextBillDate('2024-01-31','monthly')).toBe('2024-02-29')
  })
  it('detects unpayable interest and otherwise returns finite repayment',()=>{
    expect(amortization(100000,12,500).months).toBe(Infinity)
    expect(amortization(100000,12,10000).months).toBeGreaterThan(0)
  })
})
