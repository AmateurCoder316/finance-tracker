import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopAPI } from '../src/renderer/src/types'

const api: DesktopAPI = {
  load: () => ipcRenderer.invoke('finance:load'),
  save: data => ipcRenderer.invoke('finance:save',data),
  openFile: () => ipcRenderer.invoke('finance:open'),
  saveFile: (name,content,filters) => ipcRenderer.invoke('finance:export',name,content,filters),
  exportPdf: name => ipcRenderer.invoke('finance:pdf',name),
  notify: (title,body) => ipcRenderer.invoke('finance:notify',title,body)
}
contextBridge.exposeInMainWorld('finance',api)
contextBridge.exposeInMainWorld('financeEvents',{
  onNewTransaction: (callback:()=>void) => {
    const listener = () => callback()
    ipcRenderer.on('shortcut:new-transaction',listener)
    return () => ipcRenderer.removeListener('shortcut:new-transaction',listener)
  }
})
