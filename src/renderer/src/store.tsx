import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { FinanceData } from './types'
import { blankData, day } from './data'
import { netWorth } from './finance'

type Mutator = (current: FinanceData) => FinanceData
interface ContextValue {
  data: FinanceData
  ready: boolean
  mutate: (fn: Mutator) => void
  replace: (data: FinanceData) => void
  error: string
}
const Context = createContext<ContextValue | null>(null)
export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<FinanceData>(blankData)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const loaded = window.finance ? await window.finance.load() : JSON.parse(localStorage.getItem('ledger-v1') || 'null')
        if (active && loaded?.version === 1 && Array.isArray(loaded.accounts) && Array.isArray(loaded.transactions)) setData(loaded)
      } catch (e) { if (active) setError('Could not read saved data. No changes have been written.') }
      finally { if (active) setReady(true) }
    }
    void run()
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!ready) return
    if (window.finance) {
      queue.current = queue.current.then(() => window.finance!.save(data)).then(ok => {
        if (!ok) setError('Could not save changes to disk. Check available storage.')
        else setError('')
      }).catch(()=>setError('Saving failed. Your changes may not be persisted.'))
    } else {
      try { localStorage.setItem('ledger-v1',JSON.stringify(data)) }
      catch { setError('Browser storage is full.') }
    }
  }, [data,ready])
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme
    document.documentElement.style.setProperty('--accent',data.settings.accent)
  }, [data.settings.theme,data.settings.accent])
  const stamp = (next: FinanceData, revision: number) => {
    const value = netWorth(next)
    const snapshots = [...next.snapshots.filter(x=>x.date!==day()),{date:day(),value}]
    return { ...next, snapshots, revision }
  }
  const mutate = (fn: Mutator) => setData(previous => {
    const next=fn(previous)
    return next === previous ? previous : stamp(next,previous.revision+1)
  })
  const replace = (next: FinanceData) => setData(previous => stamp({ ...next, revision:previous.revision+1 },previous.revision+1))
  return <Context.Provider value={{data,ready,mutate,replace,error}}>{children}</Context.Provider>
}
export function useFinance(): ContextValue {
  const context=useContext(Context)
  if (!context) throw new Error('useFinance must be inside FinanceProvider')
  return context
}
