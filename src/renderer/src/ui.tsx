import React, { useEffect } from 'react'
import { ArrowDownRight, ArrowUpRight, ChevronRight, Plus, X } from 'lucide-react'
import { amount, pct } from './finance'
import { useFinance } from './store'

export function Money({value,currency,compact=false,positive=false}: {value:number;currency?:string;compact?:boolean;positive?:boolean}) {
  const {data}=useFinance()
  return <span className={(positive?'positive ':'')+(value<0?'negative':'')}>{data.settings.privacy?'••••••':amount(value,currency||data.settings.currency)}</span>
}
export function Panel({title,subtitle,action,children,className=''}:{title?:string;subtitle?:string;action?:React.ReactNode;children:React.ReactNode;className?:string}) {
  return <section className={'panel '+className}>
    {(title||action) && <div className="panel-head"><div><h3>{title}</h3>{subtitle&&<p className="panel-subtitle">{subtitle}</p>}</div>{action}</div>}
    {children}
  </section>
}
export function Stat({label,value,change,icon,accent=false}:{label:string;value:React.ReactNode;change?:string;icon?:React.ReactNode;accent?:boolean}) {
  return <div className={'stat '+(accent?'stat-accent':'')}><div className="stat-top"><span>{label}</span>{icon&&<span className="stat-icon">{icon}</span>}</div><strong>{value}</strong>{change&&<span className="stat-change">{change}</span>}</div>
}
export function Empty({title,description,action,label='Add new',icon}:{title:string;description:string;action?:()=>void;label?:string;icon?:React.ReactNode}) {
  return <div className="empty"><div className="empty-icon">{icon||<Plus size={23}/>}</div><h3>{title}</h3><p>{description}</p>{action&&<button className="btn btn-primary" onClick={action}><Plus size={16}/>{label}</button>}</div>
}
export function Progress({value,color}:{value:number;color?:string}) {
  return <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100,Math.max(0,value)))}><div className="progress-bar" style={{width:Math.min(100,Math.max(0,value))+'%',background:color||'var(--accent)'}}/></div>
}
export function Modal({title,subtitle,onClose,children,wide=false}:{title:string;subtitle?:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}) {
  useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler)},[onClose])
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className={'modal '+(wide?'modal-wide':'')} role="dialog" aria-modal="true" aria-label={title}>
    <header className="modal-head"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={19}/></button></header>{children}
  </div></div>
}
export function Field({label,children,hint}:{label:string;children:React.ReactNode;hint?:string}) {
  return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>
}
export function Pill({children,tone='neutral'}:{children:React.ReactNode;tone?:'neutral'|'success'|'warning'|'danger'}) {
  return <span className={'pill pill-'+tone}>{children}</span>
}
export function SectionTitle({title,detail,action}:{title:string;detail?:string;action?:React.ReactNode}) {
  return <div className="section-title"><div><h2>{title}</h2>{detail&&<p>{detail}</p>}</div>{action}</div>
}
export function Trend({current,previous,invert=false}:{current:number;previous:number;invert?:boolean}) {
  if (!previous) return <span className="muted text-small">No previous data</span>
  const change=(current-previous)/Math.abs(previous)*100
  const good=invert?change<=0:change>=0
  return <span className={'trend '+(good?'trend-good':'trend-bad')}>{change>=0?<ArrowUpRight size={15}/>:<ArrowDownRight size={15}/>} {pct(Math.abs(change))} vs last month</span>
}
export function ViewAll({onClick}:{onClick:()=>void}) {return <button className="link-btn" onClick={onClick}>View all <ChevronRight size={15}/></button>}
export function ConfirmDelete({name,onDelete}:{name:string;onDelete:()=>void}) {
  return <button className="text-danger tiny-btn" onClick={()=>{if(window.confirm('Delete '+name+'? This cannot be undone.'))onDelete()}}>Delete</button>
}
