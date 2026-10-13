import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, shell, Tray } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FinanceData } from '../src/renderer/src/types'

const dirname = fileURLToPath(new URL('.', import.meta.url))
let window: BrowserWindow | null = null
let tray: Tray | null = null
let quitting = false
let latestRevision = -1

function location() {
  const folder = app.getPath('userData')
  mkdirSync(folder, { recursive: true })
  return join(folder, 'finance.json')
}
function validData(value: unknown): value is FinanceData {
  if (!value || typeof value !== 'object') return false
  const d = value as Partial<FinanceData>
  return d.version === 1 && ['accounts','transactions','budgets','goals','trades','bills','debts','invoices','categories','snapshots'].every(key=>Array.isArray(d[key as keyof FinanceData])) && !!d.settings && typeof d.settings === 'object' && !!d.prices && typeof d.prices === 'object'
}
function readData(): FinanceData | null {
  const path = location()
  if (!existsSync(path)) return null
  const value = JSON.parse(readFileSync(path,'utf8'))
  if (!validData(value)) throw new Error('Invalid finance data file')
  latestRevision = Math.max(latestRevision,Number(value.revision) || 0)
  return value as FinanceData
}
function writeData(value: FinanceData): boolean {
  if (!validData(value)) return false
  if (!Number.isSafeInteger(value.revision) || value.revision < latestRevision) return false
  const body = JSON.stringify(value)
  if (Buffer.byteLength(body,'utf8') > 25_000_000) return false
  const path = location()
  const temporary = path + '.tmp'
  try {
    writeFileSync(temporary,body,{encoding:'utf8',mode:0o600})
    renameSync(temporary,path)
    latestRevision = value.revision
    return true
  } catch (e) { console.error('Storage write failed',e); return false }
}
function createWindow() {
  const boundsFile = join(app.getPath('userData'),'window.json')
  let bounds: {width:number;height:number;x?:number;y?:number} = { width: 1440, height: 920 }
  try { const saved = JSON.parse(readFileSync(boundsFile,'utf8')); if (saved.width >= 800 && saved.height >= 550) bounds = saved } catch { /* first launch */ }
  window = new BrowserWindow({
    ...bounds, minWidth: 860, minHeight: 620, show: false, backgroundColor:'#f7f8fa',
    title:'Ledger', autoHideMenuBar: true,
    webPreferences: {
      preload: join(dirname,'../preload/index.js'),
      contextIsolation:true, nodeIntegration:false, sandbox:true
    }
  })
  window.once('ready-to-show',()=>window?.show())
  window.on('close',(event)=>{
    if (!window) return
    try { writeFileSync(boundsFile,JSON.stringify(window.getBounds())) } catch { /* no need to block exit */ }
    if (!quitting && tray && process.platform !== 'darwin') { event.preventDefault();window.hide() }
  })
  window.on('closed',()=>{window=null})
  window.webContents.setWindowOpenHandler(({url})=>{
    if (/^https:\/\//.test(url)) void shell.openExternal(url)
    return { action:'deny' }
  })
  window.webContents.on('will-navigate',(event,url)=>{
    const allowed = process.env.ELECTRON_RENDERER_URL
    if (url !== window?.webContents.getURL() && !(allowed && url.startsWith(allowed))) event.preventDefault()
  })
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(dirname,'../renderer/index.html'))
}
function initTray() {
  // 16px single-color icon generated in memory; tray availability varies by desktop.
  const png = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAl0lEQVR42mNgGOmAkZCCoMyr/ymxYN10bUayHECpxcQ6hIkeluMzk4keluMzm4leluOyg2mgcwETPX2PzS4WUjSunaaFwg/Ouka9EBjwKBh1wKgDRh0w6oAR6wAWSjSj1w3ogJi6YmhFATVqP5wOINR6pVUDleQ0QO1QYCKlDU+L5jkTqR0JavcNmMjpzVCzYzLgXbNRAABfVDViDk7HSwAAAABJRU5ErkJggg=='
  const image = nativeImage.createFromBuffer(Buffer.from(png,'base64')).resize({width:16,height:16})
  if (image.isEmpty()) return
  try {
    tray = new Tray(image)
    tray.setToolTip('Ledger')
    tray.setContextMenu(Menu.buildFromTemplate([
      {label:'Open Ledger',click:()=>{window?.show();window?.focus()}},
      {label:'New transaction',click:()=>{window?.show();window?.webContents.send('shortcut:new-transaction')}},
      {type:'separator'},
      {label:'Quit',click:()=>{quitting=true;app.quit()}}
    ]))
    tray.on('double-click',()=>window?.show())
  } catch { tray = null }
}
app.whenReady().then(()=>{
  try { readData() } catch (e) { console.error('Stored data validation failed',e) }
  ipcMain.handle('finance:load',()=>readData())
  ipcMain.handle('finance:save',(_,value:FinanceData)=>writeData(value))
  ipcMain.handle('finance:open',async()=>{
    const {canceled,filePaths} = await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Supported finance files',extensions:['csv','json']}]})
    if (canceled || !filePaths[0]) return null
    const path = filePaths[0]
    return {name:path.split(/[\\/]/).pop() || 'import',content:readFileSync(path,'utf8')}
  })
  ipcMain.handle('finance:export',async(_,name:string,content:string,filters?:{name:string;extensions:string[]}[])=>{
    if (typeof content !== 'string' || Buffer.byteLength(content) > 30_000_000) return false
    const { canceled,filePath } = await dialog.showSaveDialog({defaultPath:String(name).replace(/[\\/]/g,'_'),filters:filters?.length ? filters : [{name:'Text file',extensions:['txt']}]})
    if (canceled || !filePath) return false
    writeFileSync(filePath,content,'utf8')
    return true
  })
  ipcMain.handle('finance:pdf',async(_,name:string)=>{
    if (!window) return false
    const {canceled,filePath} = await dialog.showSaveDialog(window,{defaultPath:String(name).replace(/[\\/]/g,'_'),filters:[{name:'PDF',extensions:['pdf']}]})
    if (canceled || !filePath) return false
    const pdf = await window.webContents.printToPDF({printBackground:true,pageSize:'A4'})
    writeFileSync(filePath,pdf)
    return true
  })
  ipcMain.handle('finance:notify',(_,title:string,body:string)=>{
    if (Notification.isSupported() && typeof title==='string' && typeof body==='string') new Notification({title:title.slice(0,80),body:body.slice(0,200)}).show()
  })
  createWindow()
  initTray()
  app.on('activate',()=>{if (BrowserWindow.getAllWindows().length===0) createWindow();else window?.show()})
})
app.on('before-quit',()=>{quitting=true})
app.on('window-all-closed',()=>{if(process.platform !== 'darwin' && !tray) app.quit()})
