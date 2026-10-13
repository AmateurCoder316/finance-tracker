import React, { useState } from 'react'
import { CalendarDays, Check, CircleDollarSign, CreditCard, Flag, Plus, Repeat, Target, TrendingDown } from 'lucide-react'
import type { Bill, Budget, Debt, Goal, Period } from './types'
import { day, uid } from './data'
import { accountBalance, amortization, budgetSpent, inputAmount, nextBillDate, toCents } from './finance'
import { useFinance } from './store'
import { ConfirmDelete, Empty, Field, Modal, Money, Panel, Pill, Progress, SectionTitle } from './ui'

export function BudgetsPage() {
  const {data,mutate}=useFinance()
  const [editing,setEditing]=useState<Budget|null|undefined>(undefined)
  const [name,setName]=useState(''),[category,setCategory]=useState('Food & groceries')
  const [limit,setLimit]=useState(''),[period,setPeriod]=useState<Period>('monthly')
  const open=(b:Budget|null)=>{setEditing(b);setName(b?.name||'');setCategory(b?.category||'Food & groceries');setLimit(b?inputAmount(b.amount):'');setPeriod(b?.period||'monthly')}
  const save=(e:React.FormEvent)=>{
    e.preventDefault();if(toCents(limit)<=0)return
    const b:Budget={id:editing?.id||uid(),name:name.trim()||category,category,amount:toCents(limit),period,createdAt:editing?.createdAt||day()}
    mutate(d=>({...d,budgets:editing?d.budgets.map(x=>x.id===editing.id?b:x):[...d.budgets,b]}));setEditing(undefined)
  }
  const spent=data.budgets.reduce((s,b)=>s+budgetSpent(b,data),0)
  return <div className="page-stack"><SectionTitle title="Budgets" detail="Set limits, see your actual spending and catch overruns." action={<button className="btn btn-primary" onClick={()=>open(null)}><Plus size={16}/> New budget</button>}/>
    <div className="metrics-grid three"><div className="stat"><span>Total allocated</span><strong><Money value={data.budgets.reduce((s,b)=>s+b.amount,0)}/></strong><small>Across budget periods</small></div><div className="stat"><span>Current period usage</span><strong><Money value={spent}/></strong><small>Sum of category budget usage</small></div><div className="stat"><span>Over budget</span><strong>{data.budgets.filter(b=>budgetSpent(b,data)>b.amount).length}</strong><small>Categories exceeding limits</small></div></div>
    {!data.budgets.length?<Empty title="Make a plan for your money" description="Create a spending limit for any category, or set an overall spending cap." action={()=>open(null)} label="Create budget"/>:<div className="budget-grid">{data.budgets.map(b=>{const used=budgetSpent(b,data),ratio=used/b.amount*100;return <Panel key={b.id}><div className="list-head"><div><h3>{b.name}</h3><p className="muted">{b.period} · {b.category}</p></div><Pill tone={ratio>100?'danger':ratio>80?'warning':'success'}>{Math.round(ratio)}% used</Pill></div><div className="budget-values"><strong><Money value={used}/></strong><span>of <Money value={b.amount}/></span></div><Progress value={ratio} color={ratio>100?'var(--danger)':ratio>80?'var(--warning)':'var(--accent)'}/><div className="list-foot"><span className={ratio>100?'text-danger':'muted'}>{ratio>100?'Exceeded by':'Remaining'} <Money value={Math.abs(b.amount-used)}/></span><div className="action-row"><button className="tiny-btn" onClick={()=>open(b)}>Edit</button><ConfirmDelete name={b.name} onDelete={()=>mutate(d=>({...d,budgets:d.budgets.filter(x=>x.id!==b.id)}))}/></div></div></Panel>})}</div>}
    <p className="hint-banner">Budgets use your base currency. If you create overlapping category and overall budgets, totals in the summary can overlap.</p>
    {editing!==undefined&&<Modal title={editing?'Edit budget':'Create budget'} onClose={()=>setEditing(undefined)}><form onSubmit={save}><div className="form-grid"><Field label="Budget name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Groceries"/></Field><Field label="Spending category"><select value={category} onChange={e=>setCategory(e.target.value)}><option>All spending</option>{data.categories.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Budget amount"><input autoFocus type="number" min=".01" required step=".01" value={limit} onChange={e=>setLimit(e.target.value)}/></Field><Field label="Reset period"><select value={period} onChange={e=>setPeriod(e.target.value as Period)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></Field></div><footer className="form-actions"><button type="button" className="btn btn-ghost" onClick={()=>setEditing(undefined)}>Cancel</button><button className="btn btn-primary">Save budget</button></footer></form></Modal>}
  </div>
}
export function GoalsPage() {
  const {data,mutate}=useFinance()
  const [editing,setEditing]=useState<Goal|null|undefined>(undefined),[adding,setAdding]=useState<Goal|null>(null)
  const [name,setName]=useState(''),[target,setTarget]=useState(''),[deadline,setDeadline]=useState(''),[priority,setPriority]=useState<Goal['priority']>('medium'),[contribution,setContribution]=useState('')
  const [showArchive,setShowArchive]=useState(false)
  const open=(g:Goal|null)=>{setEditing(g);setName(g?.name||'');setTarget(g?inputAmount(g.target):'');setDeadline(g?.deadline||'');setPriority(g?.priority||'medium')}
  const save=(e:React.FormEvent)=>{
    e.preventDefault();if(!name.trim()||toCents(target)<=0)return
    const g:Goal={id:editing?.id||uid(),name:name.trim(),target:toCents(target),saved:editing?.saved||0,deadline,priority,archived:editing?.archived,contributions:editing?.contributions||[]}
    mutate(d=>({...d,goals:editing?d.goals.map(x=>x.id===editing.id?g:x):[...d.goals,g]}));setEditing(undefined)
  }
  const add=(e:React.FormEvent)=>{
    e.preventDefault();if(!adding||!Number.isFinite(Number(contribution))||!toCents(contribution))return
    const cents=toCents(contribution)
    if(adding.saved+cents<0)return
    mutate(d=>({...d,goals:d.goals.map(g=>g.id===adding.id?{...g,saved:g.saved+cents,contributions:[...g.contributions,{id:uid(),date:day(),amount:cents}]}:g)}))
    setAdding(null);setContribution('')
  }
  const goals=data.goals.filter(g=>showArchive||!g.archived)
  return <div className="page-stack"><SectionTitle title="Savings goals" detail="Track what you're building toward, one contribution at a time." action={<button className="btn btn-primary" onClick={()=>open(null)}><Plus size={16}/> New goal</button>}/>
    <div className="metrics-grid three"><div className="stat"><span>Saved toward goals</span><strong><Money value={goals.reduce((s,g)=>s+g.saved,0)}/></strong></div><div className="stat"><span>Combined goal targets</span><strong><Money value={goals.reduce((s,g)=>s+g.target,0)}/></strong></div><div className="stat"><span>Goals completed</span><strong>{goals.filter(g=>g.saved>=g.target).length} / {goals.length}</strong></div></div>
    {!goals.length?<Empty title="Give your savings a purpose" description="Set your target amount and deadline, then log contributions to see your progress." action={()=>open(null)} label="Create a goal"/>:
    <div className="goal-grid">{goals.map(g=>{const ratio=g.saved/g.target*100;return <Panel key={g.id}><div className="list-head"><span className="goal-icon"><Target size={21}/></span><Pill tone={g.saved>=g.target?'success':'neutral'}>{g.saved>=g.target?'Completed':g.priority+' priority'}</Pill></div><h3 className="goal-name">{g.name}</h3><p className="muted">{g.deadline?'Target: '+g.deadline:'No deadline'}</p><div className="budget-values"><strong><Money value={g.saved}/></strong><span>of <Money value={g.target}/></span></div><Progress value={ratio}/><div className="list-foot"><span className="muted">{Math.min(100,Math.round(ratio))}% complete</span><div className="action-row"><button className="tiny-btn" onClick={()=>{setAdding(g);setContribution('')}}>Contribute</button><button className="tiny-btn" onClick={()=>open(g)}>Edit</button><button className="icon-btn" title={g.archived?'Restore':'Archive'} onClick={()=>mutate(d=>({...d,goals:d.goals.map(x=>x.id===g.id?{...x,archived:!x.archived}:x)}))}><Flag size={15}/></button></div></div></Panel>})}</div>}
    <p className="hint-banner">Goal contributions are earmarked allocations, not bank transfers. They do not change account balances or net worth.</p><button className="link-btn" onClick={()=>setShowArchive(!showArchive)}>{showArchive?'Hide':'Show'} archived goals</button>
    {editing!==undefined&&<Modal title={editing?'Edit goal':'Create goal'} onClose={()=>setEditing(undefined)}><form onSubmit={save}><div className="form-grid"><Field label="Goal name"><input autoFocus required value={name} onChange={e=>setName(e.target.value)} placeholder="Emergency fund"/></Field><Field label="Target amount"><input type="number" required min=".01" step=".01" value={target} onChange={e=>setTarget(e.target.value)}/></Field><Field label="Target date"><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/></Field><Field label="Priority"><select value={priority} onChange={e=>setPriority(e.target.value as Goal['priority'])}><option>low</option><option>medium</option><option>high</option></select></Field></div><footer className="form-actions"><button className="btn btn-ghost" type="button" onClick={()=>setEditing(undefined)}>Cancel</button><button className="btn btn-primary">Save goal</button></footer></form></Modal>}
    {adding&&<Modal title={'Contribute to '+adding.name} subtitle="A contribution changes goal progress only; no money is removed from an account." onClose={()=>setAdding(null)}><form onSubmit={add}><Field label="Contribution (negative to reverse)"><input autoFocus type="number" required step=".01" value={contribution} onChange={e=>setContribution(e.target.value)}/></Field><footer className="form-actions"><button type="button" className="btn btn-ghost" onClick={()=>setAdding(null)}>Cancel</button><button className="btn btn-primary">Record contribution</button></footer></form></Modal>}
  </div>
}
export function BillsPage() {
  const {data,mutate}=useFinance()
  const [editing,setEditing]=useState<Bill|null|undefined>(undefined)
  const [name,setName]=useState(''),[raw,setRaw]=useState(''),[next,setNext]=useState(day()),[interval,setInterval]=useState<Bill['interval']>('monthly')
  const [category,setCategory]=useState('Subscriptions'),[account,setAccount]=useState(''),[note,setNote]=useState('')
  const open=(b:Bill|null)=>{setEditing(b);setName(b?.name||'');setRaw(b?inputAmount(b.amount):'');setNext(b?.nextDate||day());setInterval(b?.interval||'monthly');setCategory(b?.category||'Subscriptions');setAccount(b?.accountId||data.accounts[0]?.id||'');setNote(b?.note||'')}
  const save=(e:React.FormEvent)=>{e.preventDefault();if(!name.trim()||toCents(raw)<=0||!account)return
    const b:Bill={id:editing?.id||uid(),name:name.trim(),amount:toCents(raw),nextDate:next,interval,category,accountId:account,note,status:editing?.status||'active',payments:editing?.payments||[]}
    mutate(d=>({...d,bills:editing?d.bills.map(x=>x.id===editing.id?b:x):[...d.bills,b]}));setEditing(undefined)
  }
  const pay=(b:Bill)=>{
    if(!window.confirm('Record payment of '+b.name+' and create an expense in the selected account?'))return
    const paidDate=day()
    mutate(d=>({
      ...d,
      transactions:[{id:uid(),type:'expense',accountId:b.accountId,amount:b.amount,category:b.category,date:paidDate,merchant:b.name,note:'Bill payment for '+b.nextDate,tags:['bill'],status:'posted',createdAt:new Date().toISOString()},...d.transactions],
      bills:d.bills.map(x=>x.id===b.id?{...x,nextDate:nextBillDate(x.nextDate,x.interval),status:x.interval==='once'?'cancelled':x.status,payments:[...x.payments,paidDate]}:x)
    }))
  }
  const active=[...data.bills].filter(b=>b.status==='active').sort((a,b)=>a.nextDate.localeCompare(b.nextDate))
  const monthly=data.bills.filter(b=>b.status==='active').reduce((s,b)=>s+b.amount*(b.interval==='yearly'?1/12:b.interval==='weekly'?52/12:b.interval==='once'?0:1),0)
  return <div className="page-stack"><SectionTitle title="Bills & subscriptions" detail="Know what's due before it catches you off guard." action={<button className="btn btn-primary" onClick={()=>open(null)}><Plus size={16}/> Add bill</button>}/>
    <div className="metrics-grid three"><div className="stat"><span>Estimated monthly cost</span><strong><Money value={Math.round(monthly)}/></strong></div><div className="stat"><span>Active bills</span><strong>{active.length}</strong></div><div className="stat"><span>Due / overdue</span><strong>{active.filter(b=>b.nextDate<=day()).length}</strong></div></div>
    {!data.bills.length?<Empty title="Stay ahead of recurring payments" description="Add subscriptions, utilities or one-off bills. Recording a payment creates the corresponding expense." action={()=>open(null)} label="Create bill"/>:<Panel title="Payment calendar" subtitle="Sorted by next due date"><div className="bill-list">{[...data.bills].sort((a,b)=>a.nextDate.localeCompare(b.nextDate)).map(b=><div className="bill-row" key={b.id}><div className="bill-date"><strong>{new Date(b.nextDate+'T12:00:00').toLocaleDateString('en-US',{day:'2-digit'})}</strong><span>{new Date(b.nextDate+'T12:00:00').toLocaleDateString('en-US',{month:'short'})}</span></div><div className="grow"><strong>{b.name}</strong><p className="muted">{b.category} · {b.interval} · {data.accounts.find(a=>a.id===b.accountId)?.name}</p></div><Pill tone={b.status==='cancelled'?'neutral':b.nextDate<day()?'danger':b.nextDate===day()?'warning':'success'}>{b.status==='cancelled'?'Inactive':b.nextDate<day()?'Overdue':b.nextDate===day()?'Due today':'Upcoming'}</Pill><strong><Money value={b.amount} currency={data.accounts.find(a=>a.id===b.accountId)?.currency}/></strong><div className="action-row">{b.status==='active'&&<button className="btn btn-small" onClick={()=>pay(b)}><Check size={14}/> Mark paid</button>}<button className="tiny-btn" onClick={()=>open(b)}>Edit</button><ConfirmDelete name={b.name} onDelete={()=>mutate(d=>({...d,bills:d.bills.filter(x=>x.id!==b.id)}))}/></div></div>)}</div></Panel>}
    {editing!==undefined&&<Modal title={editing?'Edit bill':'Create bill'} onClose={()=>setEditing(undefined)}><form onSubmit={save}><div className="form-grid"><Field label="Name"><input autoFocus required value={name} onChange={e=>setName(e.target.value)} placeholder="Netflix"/></Field><Field label="Cost"><input type="number" min=".01" required step=".01" value={raw} onChange={e=>setRaw(e.target.value)}/></Field><Field label="Next due date"><input type="date" required value={next} onChange={e=>setNext(e.target.value)}/></Field><Field label="Frequency"><select value={interval} onChange={e=>setInterval(e.target.value as Bill['interval'])}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="once">One-time</option></select></Field><Field label="Category"><select value={category} onChange={e=>setCategory(e.target.value)}>{data.categories.map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Pay from"><select required value={account} onChange={e=>setAccount(e.target.value)}><option value="">Choose account</option>{data.accounts.filter(a=>!a.archived).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field></div><Field label="Notes"><textarea value={note} onChange={e=>setNote(e.target.value)} rows={2}/></Field><footer className="form-actions"><button type="button" className="btn btn-ghost" onClick={()=>setEditing(undefined)}>Cancel</button><button className="btn btn-primary">Save bill</button></footer></form></Modal>}
  </div>
}
export function DebtsPage() {
  const {data,mutate}=useFinance()
  const [editing,setEditing]=useState<Debt|null|undefined>(undefined),[repaying,setRepaying]=useState<Debt|null>(null)
  const [name,setName]=useState(''),[principal,setPrincipal]=useState(''),[apr,setApr]=useState(''),[payment,setPayment]=useState('')
  const [payAmount,setPayAmount]=useState(''),[interest,setInterest]=useState(''),[account,setAccount]=useState('')
  const [error,setError]=useState('')
  const open=(x:Debt|null)=>{setEditing(x);setName(x?.name||'');setPrincipal(x?inputAmount(x.principal):'');setApr(String(x?.apr??0));setPayment(x?inputAmount(x.payment):'')}
  const save=(e:React.FormEvent)=>{e.preventDefault();if(!name.trim()||toCents(principal)<0||toCents(payment)<=0||Number(apr)<0)return
    const x:Debt={id:editing?.id||uid(),name:name.trim(),principal:toCents(principal),apr:Number(apr),payment:toCents(payment)}
    mutate(d=>({...d,debts:editing?d.debts.map(v=>v.id===editing.id?x:v):[...d.debts,x]}));setEditing(undefined)
  }
  const repay=(e:React.FormEvent)=>{
    e.preventDefault()
    const total=toCents(payAmount),fee=toCents(interest),principalPaid=total-fee
    if(!repaying || !account || total<=0 || fee<0 || principalPaid<=0 || principalPaid>repaying.principal) return setError('Enter a valid payment: principal portion must be positive and no greater than the outstanding debt.')
    mutate(d=>({...d,debts:d.debts.map(x=>x.id===repaying.id?{...x,principal:x.principal-principalPaid}:x),
      transactions:[
        {id:uid(),type:'adjustment',accountId:account,amount:-principalPaid,category:'Debt principal',date:day(),merchant:repaying.name,note:'Debt principal repayment',tags:['debt'],status:'posted',createdAt:new Date().toISOString()},
        ...(fee?[{id:uid(),type:'expense' as const,accountId:account,amount:fee,category:'Other',date:day(),merchant:repaying.name,note:'Loan interest',tags:['debt','interest'],status:'posted' as const,createdAt:new Date().toISOString()}]:[]),...d.transactions]
    }));setRepaying(null);setError('')
  }
  const principalTotal=data.debts.reduce((s,x)=>s+x.principal,0)
  return <div className="page-stack"><SectionTitle title="Debt planner" detail="Understand repayments, interest costs and payoff timelines." action={<button className="btn btn-primary" onClick={()=>open(null)}><Plus size={16}/> Add debt</button>}/>
    <div className="metrics-grid three"><div className="stat"><span>Outstanding principal</span><strong><Money value={principalTotal}/></strong></div><div className="stat"><span>Monthly planned payments</span><strong><Money value={data.debts.reduce((s,x)=>s+x.payment,0)}/></strong></div><div className="stat"><span>Tracked debts</span><strong>{data.debts.length}</strong></div></div>
    {!data.debts.length?<Empty title="No outstanding debts tracked" description="Add a loan to calculate amortization, interest and an estimated debt-free date." action={()=>open(null)} label="Add a debt"/>:<div className="budget-grid">{data.debts.map(x=>{const plan=amortization(x.principal,x.apr,x.payment);return <Panel key={x.id}><div className="list-head"><div className="account-symbol"><CreditCard size={19}/></div><Pill>{x.apr}% APR</Pill></div><h3 className="goal-name">{x.name}</h3><p className="muted">Outstanding balance</p><div className="budget-values"><strong><Money value={x.principal}/></strong></div><div className="detail-grid"><div><span>Monthly payment</span><strong><Money value={x.payment}/></strong></div><div><span>Time to payoff</span><strong>{Number.isFinite(plan.months)?plan.months+' months':'Payment too low'}</strong></div><div><span>Interest remaining</span><strong>{Number.isFinite(plan.interest)?<Money value={plan.interest}/>: '—'}</strong></div></div><div className="list-foot"><button className="btn btn-small" onClick={()=>{setRepaying(x);setPayAmount(inputAmount(x.payment));setInterest(inputAmount(Math.round(x.principal*x.apr/1200)));setAccount(data.accounts.find(a=>!a.archived)?.id||'')}}>Record repayment</button><div className="action-row"><button className="tiny-btn" onClick={()=>open(x)}>Edit</button><ConfirmDelete name={x.name} onDelete={()=>mutate(d=>({...d,debts:d.debts.filter(v=>v.id!==x.id)}))}/></div></div></Panel>})}</div>}
    <p className="hint-banner">Debts are separate liabilities and reduce net worth. Do not also create a negative-balance account for the same debt, or it will be counted twice. Estimates assume a fixed rate and fixed monthly payment.</p>
    {editing!==undefined&&<Modal title={editing?'Edit debt':'New debt'} onClose={()=>setEditing(undefined)}><form onSubmit={save}><div className="form-grid"><Field label="Debt name"><input autoFocus required value={name} onChange={e=>setName(e.target.value)} placeholder="Personal loan"/></Field><Field label="Principal remaining"><input type="number" required min="0" step=".01" value={principal} onChange={e=>setPrincipal(e.target.value)}/></Field><Field label="Annual interest rate (%)"><input type="number" required min="0" step=".01" value={apr} onChange={e=>setApr(e.target.value)}/></Field><Field label="Monthly payment"><input type="number" required min=".01" step=".01" value={payment} onChange={e=>setPayment(e.target.value)}/></Field></div><footer className="form-actions"><button className="btn btn-ghost" type="button" onClick={()=>setEditing(undefined)}>Cancel</button><button className="btn btn-primary">Save debt</button></footer></form></Modal>}
    {repaying&&<Modal title={'Repay '+repaying.name} subtitle="Principal reduces a liability; only loan interest counts as an expense." onClose={()=>setRepaying(null)}><form onSubmit={repay}><div className="form-grid"><Field label="Total payment"><input required type="number" min=".01" step=".01" value={payAmount} onChange={e=>setPayAmount(e.target.value)}/></Field><Field label="Interest portion"><input required type="number" min="0" step=".01" value={interest} onChange={e=>setInterest(e.target.value)}/></Field><Field label="Paid from account"><select required value={account} onChange={e=>setAccount(e.target.value)}>{data.accounts.filter(a=>!a.archived).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field></div>{error&&<p className="form-error">{error}</p>}<footer className="form-actions"><button className="btn btn-ghost" type="button" onClick={()=>setRepaying(null)}>Cancel</button><button className="btn btn-primary">Record repayment</button></footer></form></Modal>}
  </div>
}
