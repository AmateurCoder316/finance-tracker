import React, { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download, FileText, LockKeyhole, Plus, RotateCcw, Settings2, Shield, Trash2, Upload } from 'lucide-react'
import type { FinanceData, Settings } from './types'
import { blankData, day, demoData } from './data'
import { amount, categorySpending, csvTable, dateBounds, incomeExpense, monthSeries, monthlyStats, netWorth, transactionCsv } from './finance'
import { downloadFile } from './Ledger'
import { useFinance } from './store'
import { Empty, Field, Money, Panel, Pill, SectionTitle } from './ui'

export function ReportsPage({range}:{range:string}) {
  const {data}=useFinance()
  const [start,setStart]=useState(dateBounds(range)[0]),[end,setEnd]=useState(dateBounds(range)[1])
  const income=incomeExpense(data,start,end,'income'),expenses=incomeExpense(data,start,end,'expense')
  const categories=categorySpending(data,start,end),series=monthSeries(data,12)
  const merchants=Object.entries(data.transactions.filter(t=>t.type==='expense'&&t.status==='posted'&&t.date>=start&&t.date<=end).reduce((s,t)=>({...s,[t.merchant||'Unknown']:(s[t.merchant||'Unknown']||0)+t.amount}),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,8)
  const exportReport=()=>{
    const summary=[['Period start',start],['Period end',end],['Income',(income/100).toFixed(2)],['Expenses',(expenses/100).toFixed(2)],['Net cash flow',((income-expenses)/100).toFixed(2)],['Net worth',(netWorth(data)/100).toFixed(2)]]
    const content=csvTable(['Metric','Value'],summary)+'\r\n\r\n'+csvTable(['Category','Expense'],categories.map(c=>[c.name,(c.value/100).toFixed(2)]))
    void downloadFile('financial-report.csv',content)
  }
  return <div className="page-stack report-root"><SectionTitle title="Financial reports" detail="Turn transaction history into a clearer picture of your finances." action={<div className="action-row"><button className="btn btn-ghost" onClick={exportReport}><Download size={16}/> CSV report</button><button className="btn btn-primary" onClick={()=>window.finance?void window.finance.exportPdf('financial-report.pdf'):window.print()}><FileText size={16}/> Save PDF</button></div>}/>
    <div className="report-filters"><Field label="Start date"><input type="date" value={start} onChange={e=>setStart(e.target.value)}/></Field><Field label="End date"><input type="date" min={start} value={end} onChange={e=>setEnd(e.target.value)}/></Field><div className="report-subhead">Financial summary for {start} to {end}</div></div>
    <div className="metrics-grid four"><div className="stat"><span>Total income</span><strong><Money value={income}/></strong></div><div className="stat"><span>Total spending</span><strong><Money value={expenses}/></strong></div><div className="stat"><span>Net cash flow</span><strong className={income>=expenses?'positive':'negative'}><Money value={income-expenses}/></strong></div><div className="stat"><span>Savings rate</span><strong>{income?((income-expenses)/income*100).toFixed(1)+'%':'—'}</strong></div></div>
    <div className="content-two"><Panel title="Income vs. expenses" subtitle="Last 12 calendar months" className="wide-panel"><div className="chart-main"><ResponsiveContainer width="100%" height="100%"><BarChart data={series}><CartesianGrid vertical={false} strokeDasharray="3 5" stroke="var(--chart-grid)"/><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?(v/1000)+'k':v}/><Tooltip formatter={(v:number)=>amount(v*100,data.settings.currency)}/><Bar dataKey="income" fill="#576bd4" radius={[4,4,0,0]}/><Bar dataKey="expenses" fill="#9fc4ba" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></Panel><Panel title="Spending by category">{categories.length?<div className="allocation-list">{categories.slice(0,8).map((c,i)=><div key={c.name} className="allocation-item"><div className="list-head"><span>{c.name}</span><strong><Money value={c.value}/></strong></div><div className="progress"><div className="progress-bar" style={{width:(expenses?c.value/expenses*100:0)+'%',background:['#576bd4','#42ab94','#f2ae71','#9a8ae0'][i%4]}}/></div></div>)}</div>:<Empty title="Nothing to analyze" description="Choose another period or record expenses."/>}</Panel></div>
    <div className="content-two"><Panel title="Largest merchants">{merchants.length?merchants.map(([name,value],i)=><div className="list-row" key={name}><span className="index-number">{String(i+1).padStart(2,'0')}</span><span className="grow">{name}</span><strong><Money value={value}/></strong></div>):<p className="muted">No expenses in this range.</p>}</Panel><Panel title="Income sources">{Object.entries(data.transactions.filter(t=>t.type==='income'&&t.status==='posted'&&t.date>=start&&t.date<=end).reduce((s,t)=>({...s,[t.merchant||'Other']:(s[t.merchant||'Other']||0)+t.amount}),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).map(([source,value])=><div key={source} className="list-row"><span className="grow">{source}</span><strong><Money value={value}/></strong></div>)}{!income&&<p className="muted">No recorded income in this range.</p>}</Panel></div>
    <Panel title="Accounting notes"><p className="muted">Reports use completed transactions in each account's currency, converted with your manually configured rates. Transfers, balance adjustments, trades and principal repayments are excluded from income/expense totals. Investment valuation changes are included in net worth, not cash flow.</p></Panel>
  </div>
}

export function TaxesPage() {
  const {data,mutate}=useFinance()
  const [year,setYear]=useState(new Date().getFullYear())
  const [rate,setRate]=useState(String(data.settings.taxRate))
  const transactions=data.transactions.filter(t=>t.date.startsWith(String(year))&&t.status==='posted')
  const taxable=transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
  const deductible=transactions.filter(t=>t.type==='expense'&&t.tags.includes('deductible')).reduce((s,t)=>s+t.amount,0)
  const estimated=Math.max(0,taxable-deductible)*data.settings.taxRate/100
  return <div className="page-stack"><SectionTitle title="Tax organizer" detail="Collect records and run a simple estimate — not an official tax calculation."/>
    <div className="report-filters"><Field label="Tax year"><select value={year} onChange={e=>setYear(Number(e.target.value))}>{Array.from({length:7},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y}>{y}</option>)}</select></Field><Field label="Assumed flat tax rate (%)"><input type="number" min="0" max="100" step=".1" value={rate} onChange={e=>setRate(e.target.value)} onBlur={()=>mutate(d=>({...d,settings:{...d.settings,taxRate:Math.min(100,Math.max(0,Number(rate)||0))}}))}/></Field><button className="btn btn-ghost" onClick={()=>{mutate(d=>({...d,settings:{...d.settings,taxRate:Math.min(100,Math.max(0,Number(rate)||0))}}))}}>Apply rate</button></div>
    <div className="metrics-grid three"><div className="stat"><span>Recorded gross income</span><strong><Money value={taxable}/></strong></div><div className="stat"><span>Tagged deductible expenses</span><strong><Money value={deductible}/></strong></div><div className="stat"><span>Illustrative tax estimate</span><strong><Money value={Math.round(estimated)}/></strong><small>Not a filing amount</small></div></div>
    <Panel title="Tax-tagged expenses" action={<button className="link-btn" onClick={()=>void downloadFile('tax-records-'+year+'.csv',csvTable(['Date','Payee','Amount','Category','Note'],transactions.filter(t=>t.tags.includes('deductible')).map(t=>[t.date,t.merchant,(t.amount/100).toFixed(2),t.category,t.note])))}>Export records</button>}>{transactions.filter(t=>t.tags.includes('deductible')).length?transactions.filter(t=>t.tags.includes('deductible')).map(t=><div className="list-row" key={t.id}><span className="grow">{t.merchant||t.category}<span className="cell-sub">{t.date}</span></span><Money value={t.amount}/></div>):<p className="muted">Tag an expense "deductible" when recording a transaction to include it here.</p>}</Panel>
    <div className="hint-banner warning-banner">This calculator does not apply Finnish or other national tax brackets, deductions, VAT, capital gains classifications, or reporting requirements. Actual taxable income and allowable deductions may differ substantially. Verify figures with official tax guidance.</div>
  </div>
}
export function SettingsPage() {
  const {data,mutate,replace}=useFinance()
  const [newCategory,setNewCategory]=useState(''),[currency,setCurrency]=useState(''),[rate,setRate]=useState('')
  const [message,setMessage]=useState('')
  const setting=<K extends keyof Settings>(key:K,value:Settings[K])=>mutate(d=>({...d,settings:{...d.settings,[key]:value}}))
  const backup=()=>void downloadFile('ledger-backup-'+day()+'.json',JSON.stringify(data,null,2),'application/json','json')
  const restore=async()=>{
    setMessage('')
    const file=await window.finance?.openFile()
    if(!file)return setMessage('Restore is available in the desktop app.')
    try {
      const parsed=JSON.parse(file.content) as FinanceData
      if(parsed?.version!==1||!Array.isArray(parsed.accounts)||!Array.isArray(parsed.transactions)||!parsed.settings||!Array.isArray(parsed.goals)) throw new Error('Unsupported backup format')
      if(window.confirm('Replace all current Ledger data with this backup? This cannot be undone.')) { replace(parsed);setMessage('Backup restored locally.') }
    } catch { setMessage('This is not a valid Ledger v1 JSON backup.') }
  }
  const widgets=[['cashflow','Income & expense chart'],['spending','Spending breakdown'],['accounts','Account balances'],['goals','Savings goals'],['bills','Upcoming bills'],['investments','Net worth history']]
  return <div className="page-stack"><SectionTitle title="Settings" detail="Customize Ledger, manage your categories and take control of your records."/>
    {message&&<p className="notice">{message}</p>}
    <div className="settings-grid">
      <Panel title="Appearance" subtitle="Choose a comfortable view for working with numbers.">
        <Field label="Theme"><select value={data.settings.theme} onChange={e=>setting('theme',e.target.value as Settings['theme'])}><option value="system">Follow system</option><option value="light">Light</option><option value="dark">Dark</option></select></Field>
        <Field label="Accent color"><div className="color-picks">{['#5269d5','#138c81','#8959ba','#da7952','#357bba'].map(c=><button type="button" key={c} style={{background:c}} className={'color-pick '+(data.settings.accent===c?'selected':'')} onClick={()=>setting('accent',c)} aria-label={'Use accent '+c}/>)}</div></Field>
        <label className="switch-line"><span><strong>Privacy mode</strong><small>Hide all balance amounts on screen.</small></span><input type="checkbox" checked={data.settings.privacy} onChange={e=>setting('privacy',e.target.checked)}/></label>
        <label className="switch-line"><span><strong>Desktop notifications</strong><small>Allow supported local reminders.</small></span><input type="checkbox" checked={data.settings.notifications} onChange={e=>setting('notifications',e.target.checked)}/></label>
      </Panel>
      <Panel title="Currency & conversion" subtitle="Rates convert one unit of a currency into your base currency.">
        <Field label="Base currency"><select value={data.settings.currency} onChange={e=>{if(window.confirm('Changing your base currency requires updating conversion rates. Existing account balances are not converted automatically.'))mutate(d=>({...d,settings:{...d.settings,currency:e.target.value,rates:{[e.target.value]:1}}}))}}>{['EUR','USD','GBP','SEK','NOK','CHF','CAD','AUD','JPY'].map(c=><option key={c}>{c}</option>)}</select></Field>
        <div className="rate-list">{Object.entries(data.settings.rates).map(([c,r])=><div className="list-row" key={c}><span className="grow">1 {c} = {r} {data.settings.currency}</span>{c!==data.settings.currency&&<button className="tiny-btn text-danger" onClick={()=>mutate(d=>{const rates={...d.settings.rates};delete rates[c];return {...d,settings:{...d.settings,rates}}})}>Remove</button>}</div>)}</div>
        <div className="inline-form"><input aria-label="Currency code" value={currency} maxLength={3} onChange={e=>setCurrency(e.target.value.toUpperCase())} placeholder="USD"/><input aria-label="Exchange rate" type="number" min=".00000001" step="any" value={rate} onChange={e=>setRate(e.target.value)} placeholder="Rate to base"/><button className="btn btn-small" onClick={()=>{if(/^[A-Z]{3}$/.test(currency)&&Number(rate)>0){mutate(d=>({...d,settings:{...d.settings,rates:{...d.settings.rates,[currency]:Number(rate)}}}));setCurrency('');setRate('')}}}>Add rate</button></div>
        <p className="muted text-small">Rates are manually entered, not automatically updated.</p>
      </Panel>
      <Panel title="Dashboard widgets" subtitle="Hide panels you do not use.">
        {widgets.map(([id,label])=><label className="switch-line" key={id}><span><strong>{label}</strong></span><input type="checkbox" checked={data.settings.dashboardWidgets.includes(id)} onChange={e=>setting('dashboardWidgets',e.target.checked?[...data.settings.dashboardWidgets,id]:data.settings.dashboardWidgets.filter(x=>x!==id))}/></label>)}
      </Panel>
      <Panel title="Categories" subtitle="Create your own labels for transactions and budgets.">
        <div className="category-tags">{data.categories.map(c=><span key={c} className="category-tag">{c}<button title={'Remove '+c} disabled={data.transactions.some(t=>t.category===c)||data.budgets.some(b=>b.category===c)} onClick={()=>mutate(d=>({...d,categories:d.categories.filter(x=>x!==c)}))}>×</button></span>)}</div>
        <div className="inline-form"><input value={newCategory} placeholder="New category" onChange={e=>setNewCategory(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(newCategory.trim()&&!data.categories.includes(newCategory.trim())){mutate(d=>({...d,categories:[...d.categories,newCategory.trim()]}));setNewCategory('')}}}}/><button className="btn btn-small" onClick={()=>{if(newCategory.trim()&&!data.categories.includes(newCategory.trim())){mutate(d=>({...d,categories:[...d.categories,newCategory.trim()]}));setNewCategory('')}}}><Plus size={15}/> Add</button></div>
      </Panel>
      <Panel title="Data & backups" subtitle="Local, offline-first storage. You control your files.">
        <div className="settings-action"><div><strong>Export full data</strong><p className="muted">Human-readable JSON backup.</p></div><button className="btn btn-ghost" onClick={backup}><Download size={16}/> Backup</button></div>
        <div className="settings-action"><div><strong>Restore backup</strong><p className="muted">Replace all records from a previous backup.</p></div><button className="btn btn-ghost" onClick={()=>void restore()}><Upload size={16}/> Restore</button></div>
        <div className="settings-action"><div><strong>Export transactions</strong><p className="muted">CSV with financial movements.</p></div><button className="btn btn-ghost" onClick={()=>void downloadFile('transactions.csv',transactionCsv(data))}><Download size={16}/> Export</button></div>
        <div className="settings-action"><div><strong>Sample workspace</strong><p className="muted">Replace records with fictional sample data.</p></div><button className="btn btn-ghost" onClick={()=>{if(window.confirm('Replace all current records with demo data? Export a backup first if needed.'))replace(demoData())}}>Load demo</button></div>
        <div className="settings-action"><div><strong>Reset application</strong><p className="muted">Irreversibly delete all current financial records.</p></div><button className="btn btn-danger" onClick={()=>{if(window.confirm('Permanently remove all Ledger records on this device? This cannot be undone.'))replace(blankData())}}><Trash2 size={15}/> Clear data</button></div>
      </Panel>
      <Panel title="Privacy & security" subtitle="Transparent limitations are better than false assurances.">
        <div className="security-note"><Shield size={23}/><div><strong>Stored only on your device</strong><p>No account, analytics provider, cloud sync, or bank credentials are needed for this build. Data lives in an application-specific local JSON file.</p></div></div>
        <div className="security-note"><LockKeyhole size={23}/><div><strong>No database encryption yet</strong><p>Local storage and exported backups are unencrypted. Use full-disk encryption and operating-system account protection. Do not treat this as a secure vault for banking passwords or recovery phrases.</p></div></div>
      </Panel>
    </div>
  </div>
}
