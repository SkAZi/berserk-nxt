import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const path = require('path');

// Custom APIs for renderer
const api = {
  resoucesPath: process.env['ELECTRON_RENDERER_URL'] ? '' : path.join(process.resourcesPath, 'app.asar.unpacked', 'resources')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}