import React, { useEffect, useRef, useState } from 'react'
import { Activity, ArrowLeftRight, BarChart3, Bell, BriefcaseBusiness, CalendarClock, ChevronDown, ChevronRight, CircleHelp, Command, CreditCard, Eye, EyeOff, FileChartColumnIncreasing, Landmark, LayoutDashboard, Menu, Plus, Search, Settings, ShieldCheck, Target, TrendingUp, Wallet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { OverviewPage } from './Overview'
import { AccountsPage, TransactionForm, TransactionsPage } from './Ledger'
import { BillsPage, BudgetsPage, DebtsPage, GoalsPage } from './Planning'
import { BusinessPage, ForecastPage, InvestmentsPage } from './Wealth'
import { ReportsPage, SettingsPage, TaxesPage } from './Insights'
import { accountBalance, budgetSpent, countAlerts } from './finance'
import { day } from './data'
import { useFinance } from './store'

type Page = 'overview'|'transactions'|'accounts'|'budgets'|'goals'|'bills'|'debts'|'investments'|'forecast'|'reports'|'taxes'|'business'|'settings'
const groups:{title:string;items:{id:Page;label:string;icon:LucideIcon}[]}[]=[
  {title:'WORKSPACE',items:[{id:'overview',label:'Overview',icon:LayoutDashboard},{id:'transactions',label:'Transactions',icon:ArrowLeftRight},{id:'accounts',label:'Accounts',icon:Landmark}]},
  {title:'PLANNING',items:[{id:'budgets',label:'Budgets',icon:Wallet},{id:'goals',label:'Savings goals',icon:Target},{id:'bills',label:'Bills & subscriptions',icon:CalendarClock},{id:'debts',label:'Debt planner',icon:CreditCard}]},
  {title:'GROW & ANALYZE',items:[{id:'investments',label:'Investments',icon:TrendingUp},{id:'forecast',label:'Forecasting',icon:Activity},{id:'reports',label:'Reports',icon:BarChart3},{id:'taxes',label:'Taxes',icon:ShieldCheck},{id:'business',label:'Business',icon:BriefcaseBusiness}]}
]
const labels=Object.fromEntries([...groups.flatMap(g=>g.items),{id:'settings',label:'Settings',icon:Settings}].map(i=>[i.id,i.label]))

export default function App() {
  const {data,ready,mutate,error}=useFinance()
  const [page,setPage]=useState<Page>('overview')
  const [range,setRange]=useState('month')
  const [newTransaction,setNewTransaction]=useState(false)
  const [search,setSearch]=useState('')
  const [showNotifications,setShowNotifications]=useState(false)
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const searchRef=useRef<HTMLInputElement>(null)
  const overdue=data.bills.filter(b=>b.status==='active' && b.nextDate<=day())
  const budgetAlerts=data.budgets.filter(b=>budgetSpent(b,data)>b.amount)
  const lowBalances=data.accounts.filter(a=>!a.archived && ['checking','cash','savings'].includes(a.type)&&accountBalance(a,data)<0)
  const alerts=countAlerts(data)
  const navigate=(id:string)=>{setPage(id as Page);setSidebarOpen(false);setShowNotifications(false);window.scrollTo({top:0})}
  useEffect(()=>{
    const listener=(e:KeyboardEvent)=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setPage('transactions');searchRef.current?.focus()}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){e.preventDefault();setNewTransaction(true)}
      if(e.key==='Escape'){setShowNotifications(false);setSidebarOpen(false)}
    }
    window.addEventListener('keydown',listener)
    const off=(window as Window & {financeEvents?:{onNewTransaction:(cb:()=>void)=>()=>void}}).financeEvents?.onNewTransaction(()=>setNewTransaction(true))
    return()=>{window.removeEventListener('keydown',listener);off?.()}
  },[])
  useEffect(()=>{
    if(!ready||!data.settings.notifications||!alerts||!window.finance)return
    const key='ledger-notify-'+day()
    if(localStorage.getItem(key))return
    localStorage.setItem(key,'1')
    void window.finance.notify('Ledger: financial reminders',alerts+' account, bill or budget item(s) need attention.')
  },[ready,alerts,data.settings.notifications])
  const content=()=>{
    switch(page){
      case 'overview':return <OverviewPage range={range} onNavigate={navigate} onNew={()=>setNewTransaction(true)}/>
      case 'transactions':return <TransactionsPage query={search} range={range} onNew={()=>setNewTransaction(true)}/>
      case 'accounts':return <AccountsPage/>
      case 'budgets':return <BudgetsPage/>
      case 'goals':return <GoalsPage/>
      case 'bills':return <BillsPage/>
      case 'debts':return <DebtsPage/>
      case 'investments':return <InvestmentsPage/>
      case 'forecast':return <ForecastPage/>
      case 'reports':return <ReportsPage range={range}/>
      case 'taxes':return <TaxesPage/>
      case 'business':return <BusinessPage/>
      case 'settings':return <SettingsPage/>
    }
  }
  if(!ready)return <div className="boot-screen"><div className="brand-icon"><Wallet size={26}/></div><h1>Ledger</h1><p>Opening your private workspace...</p></div>
  return <div className="app-shell">
    {sidebarOpen&&<div className="mobile-scrim" onClick={()=>setSidebarOpen(false)}/>}
    <aside className={'sidebar '+(sidebarOpen?'sidebar-open':'')}>
      <div className="brand"><span className="brand-icon"><Wallet size={23} strokeWidth={2.15}/></span><div className="brand-title"><strong>Ledger<span>.</span></strong><small>Finance workspace</small></div><button className="icon-btn mobile-close" onClick={()=>setSidebarOpen(false)} aria-label="Close menu"><X size={18}/></button></div>
      <nav aria-label="Main navigation" className="sidebar-nav">
        {groups.map(g=><div className="nav-group" key={g.title}><div className="nav-label">{g.title}</div>{g.items.map(({id,label,icon:Icon})=><button className={'nav-item '+(page===id?'current':'')} key={id} onClick={()=>navigate(id)}><Icon size={18} strokeWidth={page===id?2.3:1.9}/><span>{label}</span>{id==='bills'&&overdue.length>0&&<span className="nav-count">{overdue.length}</span>}</button>)}</div>)}
      </nav>
      <div className="sidebar-bottom"><button className={'nav-item '+(page==='settings'?'current':'')} onClick={()=>navigate('settings')}><Settings size={18}/> Settings</button><div className="workspace-status"><span className="status-dot"/><div><strong>Local workspace</strong><small>{data.demo?'Fictional demo data':'Private to this device'}</small></div></div></div>
    </aside>
    <div className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="icon-btn menu-btn" onClick={()=>setSidebarOpen(true)} aria-label="Open menu"><Menu size={22}/></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={15}/><strong>{labels[page]}</strong></div></div>
        <div className="topbar-right">
          <label className="global-search"><Search size={17}/><input ref={searchRef} value={search} onFocus={()=>setPage('transactions')} onChange={e=>{setSearch(e.target.value);setPage('transactions')}} placeholder="Search transactions..." aria-label="Global transaction search"/><kbd>⌘ K</kbd></label>
          <select className="range-select" value={range} onChange={e=>setRange(e.target.value)} aria-label="Date range"><option value="month">This month</option><option value="90d">Last 90 days</option><option value="year">This year</option><option value="all">All time</option></select>
          <button className="icon-btn privacy-button" title={data.settings.privacy?'Show amounts':'Hide amounts'} onClick={()=>mutate(d=>({...d,settings:{...d.settings,privacy:!d.settings.privacy}}))}>{data.settings.privacy?<EyeOff size={19}/>:<Eye size={19}/>}</button>
          <div className="notification-wrap"><button className={'icon-btn '+(showNotifications?'selected':'')} aria-label="Notifications" onClick={()=>setShowNotifications(!showNotifications)}><Bell size={19}/>{alerts>0&&<span className="notification-dot"/>}</button>{showNotifications&&<div className="notification-popover"><div className="popover-title"><strong>Notifications</strong><button className="icon-btn" onClick={()=>setShowNotifications(false)}><X size={16}/></button></div>{!alerts?<p className="muted">You're all caught up.</p>:<div className="alerts-list">{overdue.map(b=><button onClick={()=>navigate('bills')} key={b.id}><span className="alert-mark">!</span><span><strong>{b.nextDate<day()?'Overdue':'Due'}: {b.name}</strong><small>Payment date: {b.nextDate}</small></span></button>)}{budgetAlerts.map(b=><button onClick={()=>navigate('budgets')} key={b.id}><span className="alert-mark">!</span><span><strong>Budget exceeded: {b.name}</strong><small>Review your spending limit</small></span></button>)}{lowBalances.map(a=><button onClick={()=>navigate('accounts')} key={a.id}><span className="alert-mark">!</span><span><strong>Negative balance: {a.name}</strong><small>Review account transactions</small></span></button>)}</div>}</div>}</div>
          <div className="avatar" title="Local profile">L</div>
        </div>
      </header>
      {error&&<div className="storage-error" role="alert">{error}</div>}
      {data.demo&&<div className="demo-strip">DEMO WORKSPACE — all displayed finances are fictional. <button onClick={()=>navigate('settings')}>Manage sample data</button></div>}
      <main className="content-area">{content()}<footer className="app-footer"><span>Ledger · Local-first personal finance</span><span>No live bank or market feeds connected</span></footer></main>
    </div>
    {newTransaction&&<TransactionForm onClose={()=>setNewTransaction(false)}/>}
  </div>
}
