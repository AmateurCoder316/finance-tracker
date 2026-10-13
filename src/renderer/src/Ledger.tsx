import React, { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Archive, Download, Plus, Search, SlidersHorizontal, Upload, Wallet, Pencil } from 'lucide-react'
import type { Account, AccountType, Transaction, TransactionType } from './types'
import { day, uid } from './data'
import { accountBalance, amount, baseValue, converted, csvTable, inputAmount, parseCsv, toCents, transactionCsv } from './finance'
import { useFinance } from './store'
import { ConfirmDelete, Empty, Field, Modal, Money, Panel, Pill, SectionTitle } from './ui'

const types: AccountType[]=['checking','cash','savings','investment','credit','loan','crypto','other']
const currencies=['EUR','USD','GBP','SEK','NOK','CHF','CAD','AUD','JPY']
const pretty=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1)
export async function downloadFile(name:string, content:string, mime='text/csv',extension='csv') {
  if (window.finance) return window.finance.saveFile(name,content,[{name:extension.toUpperCase()+' file',extensions:[extension]}])
  const blob = new Blob([content],{type:mime})
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a');link.href=url;link.download=name;link.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
  return true
}

export function TransactionForm({onClose,initial}:{onClose:()=>void;initial?:Transaction}) {
  const {data,mutate}=useFinance()
  const [type,setType]=useState<TransactionType>(initial?.type==='adjustment'?'expense':initial?.type||'expense')
  const [accountId,setAccountId]=useState(initial?.accountId||data.accounts.find(a=>!a.archived)?.id||'')
  const [targetId,setTargetId]=useState(initial?.targetAccountId||'')
  const [rawAmount,setRawAmount]=useState(initial?inputAmount(initial.amount):'')
  const [targetAmount,setTargetAmount]=useState(initial?.targetAmount?inputAmount(initial.targetAmount):'')
  const [category,setCategory]=useState(initial?.category||'Food & groceries')
  const [date,setDate]=useState(initial?.date||day())
  const [merchant,setMerchant]=useState(initial?.merchant||'')
  const [note,setNote]=useState(initial?.note||'')
  const [status,setStatus]=useState<'posted'|'pending'>(initial?.status||'posted')
  const [tags,setTags]=useState((initial?.tags||[]).join(', '))
  const [method,setMethod]=useState(initial?.method||'')
  const [split,setSplit]=useState(!!initial?.splits?.length)
  const [parts,setParts]=useState(initial?.splits?.map(x=>({category:x.category,amount:inputAmount(x.amount)}))||[{category:'Food & groceries',amount:''},{category:'Shopping',amount:''}])
  const [error,setError]=useState('')
  const accounts=data.accounts.filter(a=>!a.archived)
  const source=data.accounts.find(a=>a.id===accountId)
  const target=data.accounts.find(a=>a.id===targetId)
  const submit=(e:React.FormEvent)=>{
    e.preventDefault()
    const cents=toCents(rawAmount)
    if (!source || !Number.isSafeInteger(cents) || cents<=0) return setError('Enter a valid positive amount and choose an account.')
    if (type==='transfer' && (!target || source.id===target.id)) return setError('Choose a different destination account.')
    const destinationAmount=type!=='transfer'?undefined:source.currency===target?.currency?cents:toCents(targetAmount)
    if (type==='transfer' && (!Number.isSafeInteger(destinationAmount) || !destinationAmount || destinationAmount<=0)) return setError('Enter the amount received in the destination currency.')
    const splits=type==='expense' && split?parts.map(p=>({category:p.category,amount:toCents(p.amount)})):undefined
    if (splits && (splits.some(p=>p.amount<=0||!Number.isSafeInteger(p.amount)) || splits.reduce((s,p)=>s+p.amount,0)!==cents)) return setError('Split amounts must be positive and add up to the full amount.')
    const transaction:Transaction={
      id:initial?.id||uid(),type,accountId,amount:cents,targetAccountId:type==='transfer'?targetId:undefined,
      targetAmount:destinationAmount,category:type==='transfer'?'Transfer':category,
      date,merchant:merchant.trim(),note:note.trim(),tags:tags.split(',').map(x=>x.trim()).filter(Boolean),
      method:method.trim(),status,splits,createdAt:initial?.createdAt||new Date().toISOString()
    }
    mutate(d=>({...d,transactions:initial?d.transactions.map(t=>t.id===initial.id?transaction:t):[transaction,...d.transactions]}))
    onClose()
  }
  if(!accounts.length) return <Modal title="Add a transaction" onClose={onClose}><Empty title="Create an account first" description="Transactions need an account to debit or credit." /></Modal>
  return <Modal title={initial?'Edit transaction':'New transaction'} subtitle="Every entry updates your balances and reports." onClose={onClose} wide>
    <form onSubmit={submit}>
      <div className="segmented" role="group" aria-label="Transaction type">{(['expense','income','transfer'] as TransactionType[]).map(x=><button key={x} type="button" onClick={()=>setType(x)} className={type===x?'active':''}>{pretty(x)}</button>)}</div>
      <div className="form-grid">
        <Field label="Amount"><div className="input-suffix"><input autoFocus required type="number" min=".01" step=".01" value={rawAmount} onChange={e=>setRawAmount(e.target.value)} placeholder="0.00"/><span>{source?.currency||data.settings.currency}</span></div></Field>
        <Field label="Account"><select required value={accountId} onChange={e=>setAccountId(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
        {type==='transfer'&&<><Field label="Destination account"><select value={targetId} required onChange={e=>setTargetId(e.target.value)}><option value="">Choose an account</option>{accounts.filter(a=>a.id!==accountId).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          {target && source?.currency!==target.currency&&<Field label={'Received in '+target.currency}><input type="number" required min=".01" step=".01" value={targetAmount} onChange={e=>setTargetAmount(e.target.value)} /></Field>}</>}
        {type!=='transfer'&&<><Field label="Category"><select value={category} onChange={e=>setCategory(e.target.value)}>{data.categories.map(c=><option key={c}>{c}</option>)}</select></Field><Field label={type==='income'?'Payer / source':'Merchant / payee'}><input value={merchant} onChange={e=>setMerchant(e.target.value)} placeholder={type==='income'?'Employer or client':'Store or recipient'} /></Field></>}
        <Field label="Date"><input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></Field>
        <Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value)}><option value="posted">Completed</option><option value="pending">Pending (excluded from balances)</option></select></Field>
        <Field label="Payment method"><input value={method} onChange={e=>setMethod(e.target.value)} placeholder="Card, cash, bank transfer"/></Field>
        <Field label="Tags"><input value={tags} onChange={e=>setTags(e.target.value)} placeholder="travel, deductible"/></Field>
      </div>
      <Field label="Notes"><textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional details"/></Field>
      {type==='expense'&&<div className="split-area"><label className="checkbox-line"><input type="checkbox" checked={split} onChange={e=>setSplit(e.target.checked)}/> Split this expense across categories</label>{split&&<div className="split-rows">{parts.map((part,i)=><div className="split-row" key={i}><select value={part.category} onChange={e=>setParts(xs=>xs.map((x,j)=>j===i?{...x,category:e.target.value}:x))}>{data.categories.map(c=><option key={c}>{c}</option>)}</select><input aria-label="Split amount" type="number" min=".01" step=".01" placeholder="Amount" value={part.amount} onChange={e=>setParts(xs=>xs.map((x,j)=>j===i?{...x,amount:e.target.value}:x))}/><button type="button" className="tiny-btn" onClick={()=>setParts(xs=>xs.filter((_,j)=>j!==i))}>Remove</button></div>)}<button className="link-btn" type="button" onClick={()=>setParts(xs=>[...xs,{category:'Other',amount:''}])}>+ Add split</button></div>}</div>}
      {error&&<p className="form-error">{error}</p>}
      <footer className="form-actions"><button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button><button className="btn btn-primary" type="submit">{initial?'Save changes':'Add transaction'}</button></footer>
    </form>
  </Modal>
}

export function TransactionsPage({query='',onNew,range='all'}:{query?:string;onNew:()=>void;range?:string}) {
  const {data,mutate}=useFinance()
  const [search,setSearch]=useState('')
  const [type,setType]=useState('all'),[category,setCategory]=useState('all'),[account,setAccount]=useState('all')
  const [editing,setEditing]=useState<Transaction|null>(null)
  const [importRows,setImportRows]=useState<Transaction[]|null>(null)
  const [importError,setImportError]=useState('')
  const [sort,setSort]=useState<'newest'|'oldest'|'largest'>('newest')
  const visible=useMemo(()=>{
    const q=(query||search).toLowerCase().trim()
    return data.transactions.filter(t=>{
      if(type!=='all'&&t.type!==type)return false
      if(category!=='all'&&t.category!==category)return false
      if(account!=='all'&&t.accountId!==account&&t.targetAccountId!==account)return false
      if(q && ![t.merchant,t.note,t.category,t.date,t.amount/100,...t.tags].join(' ').toLowerCase().includes(q))return false
      return true
    }).sort((a,b)=>sort==='largest'?b.amount-a.amount:sort==='oldest'?a.date.localeCompare(b.date):b.date.localeCompare(a.date))
  },[data.transactions,query,search,type,category,account,sort])
  const doImport=async()=>{
    setImportError('')
    if (!data.accounts.length) return setImportError('Create an account before importing transactions.')
    const file=await window.finance?.openFile()
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) return setImportError('This importer accepts CSV. JSON backups can be restored in Settings.')
    const raw=parseCsv(file.content)
    if(raw.length<2) return setImportError('The CSV file is empty or has no data rows.')
    const header=raw[0].map(s=>s.trim().toLowerCase())
    const pick=(row:string[],...names:string[])=>{const index=header.findIndex(h=>names.includes(h));return index>=0?row[index]||'':''}
    const fallback=data.accounts.find(a=>!a.archived)!
    let skipped=0
    const rows:Transaction[]=[]
    const existing = new Set(data.transactions.map(t=>[t.date,t.accountId,t.type,t.amount,t.merchant.toLowerCase()].join('|')))
    for(const row of raw.slice(1)){
      const rawDate=pick(row,'date','transaction date','booking date')
      const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)?rawDate: ''
      const rawNumber=pick(row,'amount','value','total').replace(/\s/g,'').replace(',','.')
      const numeric=Number(rawNumber)
      const kind=pick(row,'type','transaction type').toLowerCase() || (numeric<0?'expense':'income')
      const ttype=kind==='income'?'income':kind==='expense'?'expense':null
      const accountName=pick(row,'account','account name')
      const selected=data.accounts.find(a=>a.name.toLowerCase()===accountName.toLowerCase())||fallback
      const cents=toCents(Math.abs(numeric))
      if(!date || !ttype || !Number.isSafeInteger(cents) || cents<=0) {skipped++;continue}
      const merchant=pick(row,'merchant','payee','description','name')
      const fingerprint=[date,selected.id,ttype,cents,merchant.toLowerCase()].join('|')
      if(existing.has(fingerprint)){skipped++;continue}
      existing.add(fingerprint)
      rows.push({id:uid(),date,amount:cents,type:ttype,accountId:selected.id,category:pick(row,'category')||'Other',
        merchant,note:pick(row,'note','notes','memo'),tags:[],status:'posted',createdAt:new Date().toISOString()})
    }
    setImportError(skipped?skipped+' rows skipped (invalid or duplicate).':'')
    setImportRows(rows)
  }
  const completeImport=()=>{
    if(importRows?.length)mutate(d=>({...d,transactions:[...importRows,...d.transactions]}))
    setImportRows(null)
  }
  return <div className="page-stack">
    <SectionTitle title="Transactions" detail="Search, review and manage every movement of money." action={<div className="action-row"><button className="btn btn-ghost" onClick={doImport}><Upload size={16}/> Import CSV</button><button className="btn btn-ghost" onClick={()=>void downloadFile('transactions.csv',transactionCsv(data))}><Download size={16}/> Export</button><button className="btn btn-primary" onClick={onNew}><Plus size={16}/> Add transaction</button></div>}/>
    {importError&&<p className="notice">{importError}</p>}
    <Panel className="table-panel">
      <div className="filter-row"><label className="search-box"><Search size={17}/><input aria-label="Search transactions" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search merchants, notes, dates..."/></label>
        <select aria-label="Transaction type" value={type} onChange={e=>setType(e.target.value)}><option value="all">All types</option><option value="expense">Expenses</option><option value="income">Income</option><option value="transfer">Transfers</option><option value="adjustment">Adjustments</option></select>
        <select aria-label="Category" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{data.categories.map(c=><option key={c}>{c}</option>)}</select>
        <select aria-label="Account" value={account} onChange={e=>setAccount(e.target.value)}><option value="all">All accounts</option>{data.accounts.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select>
        <select aria-label="Sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="largest">Largest first</option></select>
      </div>
      {!visible.length?<Empty title="No transactions found" description={data.transactions.length?'Try adjusting your filters.':'Add your first transaction to start tracking cash flow.'} action={!data.transactions.length?onNew:undefined} label="Add transaction"/>:
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Transaction</th><th>Category</th><th>Account</th><th>Date</th><th>Status</th><th className="align-right">Amount</th><th></th></tr></thead><tbody>
        {visible.map(t=><tr key={t.id}><td><div className="cell-main"><span className={'tx-icon tx-'+t.type}>{t.type==='income'?<ArrowDownLeft size={18}/>:t.type==='transfer'?<ArrowLeftRight size={18}/>:<ArrowUpRight size={18}/>}</span><div><strong>{t.merchant||pretty(t.type)}</strong><span className="cell-sub">{t.note||t.tags.join(', ')||pretty(t.type)}</span></div></div></td>
          <td>{t.category}</td><td>{data.accounts.find(a=>a.id===t.accountId)?.name||'Archived account'}</td><td>{t.date}</td><td><Pill tone={t.status==='posted'?'success':'warning'}>{t.status}</Pill></td>
          <td className={'align-right value-cell '+(t.type==='income'?'positive':'')}>{t.type==='income'?'+':t.type==='expense'?'−':''}<Money value={t.amount} currency={data.accounts.find(a=>a.id===t.accountId)?.currency}/></td><td className="table-actions"><button className="icon-btn" aria-label="Edit" onClick={()=>setEditing(t)}><Pencil size={15}/></button><ConfirmDelete name="transaction" onDelete={()=>mutate(d=>({...d,transactions:d.transactions.filter(x=>x.id!==t.id)}))}/></td></tr>)}
      </tbody></table></div>}
      {!!visible.length&&<div className="table-footer">{visible.length} transaction{visible.length===1?'':'s'}</div>}
    </Panel>
    {editing&&<TransactionForm initial={editing} onClose={()=>setEditing(null)}/>}
    {importRows&&<Modal title="Review CSV import" subtitle="Duplicate entries have been excluded. Verify the source account before importing." onClose={()=>setImportRows(null)}>
      <p><strong>{importRows.length} valid new transactions</strong> ready to import.</p>
      <div className="import-preview">{importRows.slice(0,6).map(t=><div key={t.id} className="list-row"><span>{t.date} · {t.merchant||t.category}</span><Money value={t.amount}/></div>)}</div>
      <footer className="form-actions"><button className="btn btn-ghost" onClick={()=>setImportRows(null)}>Cancel</button><button className="btn btn-primary" disabled={!importRows.length} onClick={completeImport}>Import transactions</button></footer>
    </Modal>}
  </div>
}

export function AccountsPage() {
  const {data,mutate}=useFinance()
  const [editor,setEditor]=useState<Account|null|undefined>(undefined)
  const [name,setName]=useState(''),[type,setType]=useState<AccountType>('checking')
  const [currency,setCurrency]=useState(data.settings.currency),[opening,setOpening]=useState('0.00'),[group,setGroup]=useState('Personal')
  const [reconcile,setReconcile]=useState<Account|null>(null),[actual,setActual]=useState('')
  const [showArchived,setShowArchived]=useState(false)
  const open=(account:Account|null)=>{setEditor(account);setName(account?.name||'');setType(account?.type||'checking');setCurrency(account?.currency||data.settings.currency);setOpening(inputAmount(account?.openingBalance||0));setGroup(account?.group||'Personal')}
  const save=(e:React.FormEvent)=>{
    e.preventDefault()
    if(!name.trim()||!Number.isFinite(Number(opening)))return
    const a:Account={id:editor?.id||uid(),name:name.trim(),type,currency,openingBalance:toCents(opening),group:group.trim(),
      createdAt:editor?.createdAt||day(),archived:editor?.archived||false}
    mutate(d=>({...d,accounts:editor?d.accounts.map(x=>x.id===editor.id?a:x):[...d.accounts,a]}));setEditor(undefined)
  }
  const submitReconcile=(e:React.FormEvent)=>{
    e.preventDefault();if(!reconcile||!Number.isFinite(Number(actual)))return
    const difference=toCents(actual)-accountBalance(reconcile,data)
    if(difference)mutate(d=>({...d,transactions:[{id:uid(),type:'adjustment',accountId:reconcile.id,amount:difference,category:'Balance adjustment',date:day(),merchant:'Balance reconciliation',note:'Reconciled to '+actual,tags:['reconciliation'],status:'posted',createdAt:new Date().toISOString()},...d.transactions]}))
    setReconcile(null)
  }
  const shown=data.accounts.filter(a=>showArchived||!a.archived)
  return <div className="page-stack"><SectionTitle title="Accounts & balances" detail="A single view of all the places you keep money." action={<button className="btn btn-primary" onClick={()=>open(null)}><Plus size={16}/> Add account</button>}/>
    <div className="account-summary"><div><span>Available across cash accounts</span><strong><Money value={data.accounts.filter(a=>!a.archived&&['checking','cash','savings'].includes(a.type)).reduce((s,a)=>s+(Number.isFinite(converted(accountBalance(a,data),a.currency,data))?converted(accountBalance(a,data),a.currency,data):0),0)}/></strong></div><p>Investment holdings and liabilities are reflected in net worth, not available cash.</p></div>
    {!data.accounts.length?<Empty title="Your money needs a home" description="Add bank, cash, savings and investment accounts. Balances are computed from opening balances and transactions." action={()=>open(null)} label="Create first account"/>:<>
      <div className="account-grid">{shown.map(a=><div className="account-card" key={a.id}><div className="account-card-top"><span className="account-symbol"><Wallet size={19}/></span><Pill>{pretty(a.type)}{a.archived?' · archived':''}</Pill></div><span className="account-name">{a.name}</span><strong className="account-value"><Money value={accountBalance(a,data)} currency={a.currency}/></strong><div className="account-card-foot"><span>{a.group||'Ungrouped'} · {a.currency}</span><div className="action-row"><button className="icon-btn" aria-label={'Edit '+a.name} onClick={()=>open(a)}><Pencil size={16}/></button><button className="tiny-btn" onClick={()=>{setReconcile(a);setActual(inputAmount(accountBalance(a,data)))}}>Reconcile</button><button className="icon-btn" title={a.archived?'Restore':'Archive'} onClick={()=>mutate(d=>({...d,accounts:d.accounts.map(x=>x.id===a.id?{...x,archived:!a.archived}:x)}))}><Archive size={16}/></button></div></div></div>)}</div>
      <button className="link-btn" onClick={()=>setShowArchived(!showArchived)}>{showArchived?'Hide':'Show'} archived accounts</button>
    </>}
    <p className="hint-banner">Multi-currency totals use the conversion rates in Settings. Accounts without a valid rate are excluded from combined totals, but retain their original balance.</p>
    {editor!==undefined&&<Modal title={editor?'Edit account':'New account'} onClose={()=>setEditor(undefined)}><form onSubmit={save}><div className="form-grid"><Field label="Account name"><input autoFocus required value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Everyday bank"/></Field><Field label="Account type"><select value={type} onChange={e=>setType(e.target.value as AccountType)}>{types.map(t=><option value={t} key={t}>{pretty(t)}</option>)}</select></Field><Field label="Currency"><select value={currency} onChange={e=>setCurrency(e.target.value)} disabled={!!editor && data.transactions.some(t=>t.accountId===editor.id||t.targetAccountId===editor.id)}>{currencies.map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Opening balance"><input type="number" step=".01" required value={opening} onChange={e=>setOpening(e.target.value)}/></Field><Field label="Group"><input value={group} onChange={e=>setGroup(e.target.value)} placeholder="Personal, Business..."/></Field></div><footer className="form-actions"><button type="button" className="btn btn-ghost" onClick={()=>setEditor(undefined)}>Cancel</button><button className="btn btn-primary">Save account</button></footer></form></Modal>}
    {reconcile&&<Modal title={'Reconcile '+reconcile.name} subtitle="Creates a traceable balance adjustment instead of rewriting transaction history." onClose={()=>setReconcile(null)}><form onSubmit={submitReconcile}><Field label="Actual account balance"><input required autoFocus type="number" step=".01" value={actual} onChange={e=>setActual(e.target.value)}/></Field><p className="muted text-small">Current recorded balance: {amount(accountBalance(reconcile,data),reconcile.currency)}</p><footer className="form-actions"><button className="btn btn-ghost" type="button" onClick={()=>setReconcile(null)}>Cancel</button><button className="btn btn-primary">Reconcile</button></footer></form></Modal>}
  </div>
}
