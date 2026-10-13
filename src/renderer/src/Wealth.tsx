import React, { useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, BriefcaseBusiness, CircleDollarSign, Landmark, Plus, TrendingUp } from 'lucide-react'
import type { Invoice, Trade } from './types'
import { day, uid } from './data'
import { accountById, amount, forecast, holdings, inputAmount, portfolioValue, toCents } from './finance'
import { useFinance } from './store'
import { ConfirmDelete, Empty, Field, Modal, Money, Panel, Pill, SectionTitle } from './ui'
import { downloadFile } from './Ledger'
import { csvTable } from './finance'

export function InvestmentsPage() {
  const {data,mutate}=useFinance()
  const [newTrade,setNewTrade]=useState(false),[pricing,setPricing]=useState<string|null>(null)
  const [symbol,setSymbol]=useState(''),[name,setName]=useState(''),[kind,setKind]=useState<Trade['assetType']>('stock')
  const [side,setSide]=useState<Trade['side']>('buy'),[qty,setQty]=useState(''),[unitPrice,setUnitPrice]=useState(''),[fee,setFee]=useState('0.00'),[account,setAccount]=useState('')
  const [date,setDate]=useState(day()),[quote,setQuote]=useState(''),[error,setError]=useState('')
  const list=holdings(data),value=portfolioValue(data)
  const cost=list.reduce((s,h)=>s+h.cost,0),gain=list.reduce((s,h)=>s+h.unrealized,0),realized=list.reduce((s,h)=>s+h.realized,0)
  const saveTrade=(e:React.FormEvent)=>{
    e.preventDefault()
    const quantity=Number(qty),price=toCents(unitPrice),fees=toCents(fee),ticker=symbol.trim().toUpperCase()
    if(!ticker||!account||!Number.isFinite(quantity)||quantity<=0||!Number.isSafeInteger(price)||price<=0||fees<0)return setError('Enter a valid symbol, account, quantity, price and fee.')
    if(side==='sell'){
      const previous=holdings({...data,trades:data.trades.filter(t=>t.date<=date)}).find(x=>x.accountId===account&&x.symbol===ticker)
      if(!previous||previous.quantity+0.00000001<quantity)return setError('Cannot sell more units than your recorded holdings as of this date.')
    }
    const t:Trade={id:uid(),symbol:ticker,name:name.trim()||ticker,assetType:kind,side,quantity,price,fee:fees,accountId:account,date}
    mutate(d=>({...d,trades:[...d.trades,t]}));setNewTrade(false);setError('')
  }
  const saveQuote=(e:React.FormEvent)=>{
    e.preventDefault();if(!pricing||toCents(quote)<=0)return
    const h=list.find(h=>h.symbol===pricing)
    mutate(d=>({...d,prices:{...d.prices,[pricing]:{price:toCents(quote),currency:h?.currency||d.settings.currency,updatedAt:day()}}}))
    setPricing(null)
  }
  return <div className="page-stack"><SectionTitle title="Investments" detail="Track holdings, trades and unrealized performance. Prices are manual, not live." action={<button className="btn btn-primary" onClick={()=>{setNewTrade(true);setAccount(data.accounts.find(a=>a.type==='investment')?.id||data.accounts[0]?.id||'');setDate(day());setError('')}}><Plus size={16}/> Record trade</button>}/>
    <div className="metrics-grid four"><div className="stat"><span>Portfolio market value</span><strong><Money value={value}/></strong><small>Based on entered prices</small></div><div className="stat"><span>Remaining cost basis</span><strong><Money value={cost}/></strong></div><div className="stat"><span>Unrealized P/L</span><strong className={gain>=0?'positive':'negative'}><Money value={gain}/></strong></div><div className="stat"><span>Realized P/L</span><strong className={realized>=0?'positive':'negative'}><Money value={realized}/></strong></div></div>
    {!data.trades.length?<Empty title="Start tracking your portfolio" description="Record a purchase to track shares, cost basis and performance. No brokerage connection is required." action={()=>{setNewTrade(true);setAccount(data.accounts[0]?.id||'')}} label="Record first trade"/>:<div className="content-two">
      <Panel title="Your holdings" className="wide-panel"><div className="table-scroll"><table className="data-table"><thead><tr><th>Asset</th><th>Units</th><th className="align-right">Last entered price</th><th className="align-right">Market value</th><th className="align-right">Unrealized P/L</th><th></th></tr></thead><tbody>{list.map(h=><tr key={h.key}><td><div className="cell-main"><span className="holding-symbol">{h.symbol.slice(0,2)}</span><div><strong>{h.symbol}</strong><span className="cell-sub">{h.name} · {h.assetType}</span></div></div></td><td>{Number(h.quantity.toFixed(6))}</td><td className="align-right"><Money value={h.price} currency={h.currency}/><span className="cell-sub">{h.priceDate||'Last trade'}</span></td><td className="align-right"><Money value={h.value} currency={h.currency}/></td><td className={'align-right '+(h.unrealized>=0?'positive':'negative')}><Money value={h.unrealized} currency={h.currency}/></td><td><button className="tiny-btn" onClick={()=>{setPricing(h.symbol);setQuote(inputAmount(h.price))}}>Update price</button></td></tr>)}</tbody></table></div></Panel>
      <Panel title="Allocation by holding">{!list.length?<p className="muted">No open holdings.</p>:<div className="allocation-list">{list.map((h,i)=><div className="allocation-item" key={h.key}><div className="list-head"><span><span className="dot" style={{background:['#5269d5','#2da990','#f3aa65','#a28ae8','#87b8cb'][i%5]}}/>{h.symbol}</span><strong>{value>0?Math.round(h.value/value*100):0}%</strong></div><div className="progress"><div className="progress-bar" style={{width:(value?Math.min(100,h.value/value*100):0)+'%',background:['#5269d5','#2da990','#f3aa65','#a28ae8','#87b8cb'][i%5]}}/></div></div>)}</div>}</Panel>
    </div>}
    {!!data.trades.length&&<Panel title="Trade history" action={<button className="link-btn" onClick={()=>void downloadFile('investment-trades.csv',csvTable(['Date','Symbol','Side','Quantity','Price','Fee','Account'],data.trades.map(t=>[t.date,t.symbol,t.side,t.quantity,(t.price/100).toFixed(2),(t.fee/100).toFixed(2),accountById(data,t.accountId)?.name]))) }>Export CSV</button>}>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>Date</th><th>Asset</th><th>Action</th><th>Quantity</th><th className="align-right">Unit price</th><th className="align-right">Fees</th><th></th></tr></thead><tbody>{[...data.trades].sort((a,b)=>b.date.localeCompare(a.date)).map(t=><tr key={t.id}><td>{t.date}</td><td><strong>{t.symbol}</strong></td><td><Pill tone={t.side==='buy'?'success':'warning'}>{t.side}</Pill></td><td>{t.quantity}</td><td className="align-right"><Money value={t.price} currency={accountById(data,t.accountId)?.currency}/></td><td className="align-right"><Money value={t.fee} currency={accountById(data,t.accountId)?.currency}/></td><td><ConfirmDelete name="trade" onDelete={()=>mutate(d=>({...d,trades:d.trades.filter(x=>x.id!==t.id)}))}/></td></tr>)}</tbody></table></div>
    </Panel>}
    <p className="hint-banner">A buy reduces account cash and creates an investment asset; a sale does the reverse. Market valuations update only when you enter prices. Investment returns and allocation may be distorted across currencies without conversion rates.</p>
    {newTrade&&<Modal title="Record investment trade" subtitle="Trade value and fees are reflected in the linked account balance." onClose={()=>setNewTrade(false)} wide><form onSubmit={saveTrade}><div className="segmented"><button type="button" className={side==='buy'?'active':''} onClick={()=>setSide('buy')}>Buy</button><button type="button" className={side==='sell'?'active':''} onClick={()=>setSide('sell')}>Sell</button></div><div className="form-grid"><Field label="Ticker / symbol"><input autoFocus required value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} placeholder="AAPL"/></Field><Field label="Company or asset"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Apple Inc."/></Field><Field label="Asset class"><select value={kind} onChange={e=>setKind(e.target.value as Trade['assetType'])}><option value="stock">Stock</option><option value="etf">ETF</option><option value="fund">Fund</option><option value="crypto">Crypto</option><option value="other">Other</option></select></Field><Field label="Funding account"><select required value={account} onChange={e=>setAccount(e.target.value)}><option value="">Choose account</option>{data.accounts.filter(a=>!a.archived).map(a=><option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select></Field><Field label="Quantity"><input type="number" required min=".000001" step="any" value={qty} onChange={e=>setQty(e.target.value)}/></Field><Field label="Price per unit"><input type="number" required min=".01" step=".01" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)}/></Field><Field label="Trading fees"><input type="number" required min="0" step=".01" value={fee} onChange={e=>setFee(e.target.value)}/></Field><Field label="Trade date"><input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></Field></div>{error&&<p className="form-error">{error}</p>}<footer className="form-actions"><button className="btn btn-ghost" type="button" onClick={()=>setNewTrade(false)}>Cancel</button><button className="btn btn-primary">Record {side}</button></footer></form></Modal>}
    {pricing&&<Modal title={'Update '+pricing+' price'} subtitle="Manual valuation only — no real-time feed connected." onClose={()=>setPricing(null)}><form onSubmit={saveQuote}><Field label="Price per unit"><input autoFocus type="number" min=".01" step=".01" required value={quote} onChange={e=>setQuote(e.target.value)}/></Field><footer className="form-actions"><button type="button" className="btn btn-ghost" onClick={()=>setPricing(null)}>Cancel</button><button className="btn btn-primary">Update valuation</button></footer></form></Modal>}
  </div>
}

export function ForecastPage() {
  const {data}=useFinance()
  const [months,setMonths]=useState(12),[growth,setGrowth]=useState(3),[adjust,setAdjust]=useState(0)
  const baseline=forecast(data,months,0,0),estimate=forecast(data,months,Math.round(adjust*100),growth)
  const ending=estimate[estimate.length-1]?.value*100||0
  const comparison=[{name:'Current net worth',value:baseline[0].value*100},{name:'Projected net worth',value:ending}]
  return <div className="page-stack"><SectionTitle title="Forecasting" detail="Explore what-if scenarios using cash flow and adjustable assumptions."/>
    <div className="metrics-grid three"><div className="stat"><span>Current net worth</span><strong><Money value={baseline[0].value*100}/></strong></div><div className="stat"><span>Projected net worth</span><strong><Money value={ending}/></strong><small>{months} months from now</small></div><div className="stat"><span>Estimated change</span><strong><Money value={ending-baseline[0].value*100}/></strong></div></div>
    <Panel title="Net worth scenario" subtitle="Model: current net worth × monthly growth + estimated monthly net cash flow" className="forecast-panel">
      <div className="chart-large"><ResponsiveContainer width="100%" height="100%"><AreaChart data={estimate}><defs><linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5269d5" stopOpacity={.25}/><stop offset="100%" stopColor="#5269d5" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--chart-grid)"/><XAxis dataKey="name" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false} tickFormatter={v=>Math.round(v/1000)+'k'}/><Tooltip formatter={(v:number)=>amount(v*100,data.settings.currency)}/><Area dataKey="value" stroke="#5269d5" strokeWidth={3} fill="url(#forecastFill)" type="monotone"/></AreaChart></ResponsiveContainer></div>
      <div className="forecast-controls"><label>Projection length <strong>{months} months</strong><input type="range" min="3" max="60" value={months} onChange={e=>setMonths(Number(e.target.value))}/></label><label>Assumed annual return <strong>{growth}%</strong><input type="range" min="-20" max="20" step="1" value={growth} onChange={e=>setGrowth(Number(e.target.value))}/></label><label>Additional monthly savings <strong>{amount(adjust*100,data.settings.currency)}</strong><input type="range" min="-1000" max="2000" step="50" value={adjust} onChange={e=>setAdjust(Number(e.target.value))}/></label></div>
    </Panel>
    <Panel title="Understanding the projection"><p className="muted">Based on the average net cash flow of the last three displayed months. Growth is assumed to apply to the full net worth, with fixed monthly cash flows and no inflation, taxes or changes in prices. This is a scenario calculator, not an investment forecast or prediction.</p></Panel>
  </div>
}

export function BusinessPage() {
  const {data,mutate}=useFinance()
  const [editor,setEditor]=useState(false),[number,setNumber]=useState('INV-'+String(data.invoices.length+1).padStart(3,'0'))
  const [client,setClient]=useState(''),[description,setDescription]=useState(''),[sum,setSum]=useState(''),[due,setDue]=useState(day()),[issued,setIssued]=useState(day())
  const [paying,setPaying]=useState<Invoice|null>(null),[account,setAccount]=useState('')
  const save=(e:React.FormEvent)=>{
    e.preventDefault();if(!client.trim()||!number.trim()||toCents(sum)<=0)return
    mutate(d=>({...d,invoices:[{id:uid(),number,client:client.trim(),description,amount:toCents(sum),issued,due,status:'sent'},...d.invoices]}));setEditor(false)
  }
  const paid=(e:React.FormEvent)=>{
    e.preventDefault();if(!paying||!account)return
    mutate(d=>({...d,invoices:d.invoices.map(i=>i.id===paying.id?{...i,status:'paid',paidOn:day()}:i),
      transactions:[{id:uid(),type:'income',accountId:account,amount:paying.amount,category:'Business',date:day(),merchant:paying.client,note:'Paid invoice '+paying.number,tags:['business','invoice'],status:'posted',createdAt:new Date().toISOString()},...d.transactions]}))
    setPaying(null)
  }
  const invoices=data.invoices,paidSum=invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount,0)
  return <div className="page-stack"><SectionTitle title="Business finance" detail="Track client invoices and incoming payments separately from personal spending categories." action={<button className="btn btn-primary" onClick={()=>setEditor(true)}><Plus size={16}/> New invoice</button>}/>
    <div className="metrics-grid three"><div className="stat"><span>Total invoiced</span><strong><Money value={invoices.reduce((s,i)=>s+i.amount,0)}/></strong></div><div className="stat"><span>Recorded paid</span><strong><Money value={paidSum}/></strong></div><div className="stat"><span>Outstanding</span><strong><Money value={invoices.filter(i=>i.status!=='paid').reduce((s,i)=>s+i.amount,0)}/></strong></div></div>
    {!invoices.length?<Empty title="Keep an eye on receivables" description="Record invoices and mark them paid to post income into your accounts." action={()=>setEditor(true)} label="Create an invoice"/>:<Panel title="Client invoices" action={<button className="link-btn" onClick={()=>void downloadFile('invoices.csv',csvTable(['Number','Client','Description','Issued','Due','Amount','Status'],invoices.map(i=>[i.number,i.client,i.description,i.issued,i.due,(i.amount/100).toFixed(2),i.status])))}>Export CSV</button>}><div className="table-scroll"><table className="data-table"><thead><tr><th>Invoice</th><th>Client</th><th>Issue date</th><th>Due date</th><th>Status</th><th className="align-right">Amount</th><th></th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td><strong>{i.number}</strong><span className="cell-sub">{i.description}</span></td><td>{i.client}</td><td>{i.issued}</td><td>{i.due}</td><td><Pill tone={i.status==='paid'?'success':i.due<day()?'danger':'warning'}>{i.status}</Pill></td><td className="align-right"><Money value={i.amount}/></td><td><div className="action-row">{i.status!=='paid'&&<button className="btn btn-small" onClick={()=>{setPaying(i);setAccount(data.accounts[0]?.id||'')}}>Mark paid</button>}<ConfirmDelete name={'invoice '+i.number} onDelete={()=>mutate(d=>({...d,invoices:d.invoices.filter(x=>x.id!==i.id)}))}/></div></td></tr>)}</tbody></table></div></Panel>}
    <p className="hint-banner">Invoices are internal payment records, not compliant tax invoices or official receipts. Tax and VAT rules depend on jurisdiction. For formal billing, use an invoicing provider.</p>
    {editor&&<Modal title="New invoice" onClose={()=>setEditor(false)}><form onSubmit={save}><div className="form-grid"><Field label="Invoice number"><input autoFocus required value={number} onChange={e=>setNumber(e.target.value)}/></Field><Field label="Client"><input required value={client} onChange={e=>setClient(e.target.value)}/></Field><Field label="Amount"><input type="number" required min=".01" step=".01" value={sum} onChange={e=>setSum(e.target.value)}/></Field><Field label="Issued"><input type="date" required value={issued} onChange={e=>setIssued(e.target.value)}/></Field><Field label="Due"><input type="date" required value={due} onChange={e=>setDue(e.target.value)}/></Field></div><Field label="Description"><textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)}/></Field><footer className="form-actions"><button className="btn btn-ghost" type="button" onClick={()=>setEditor(false)}>Cancel</button><button className="btn btn-primary">Create invoice</button></footer></form></Modal>}
    {paying&&<Modal title={'Receive '+paying.number} subtitle="This records income in the selected account." onClose={()=>setPaying(null)}><form onSubmit={paid}><Field label="Deposit into"><select value={account} onChange={e=>setAccount(e.target.value)}>{data.accounts.filter(a=>!a.archived).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field><footer className="form-actions"><button className="btn btn-ghost" type="button" onClick={()=>setPaying(null)}>Cancel</button><button className="btn btn-primary">Confirm payment</button></footer></form></Modal>}
  </div>
}
