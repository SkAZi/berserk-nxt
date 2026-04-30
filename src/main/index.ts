import { app, shell, BrowserWindow, Menu, ipcMain, dialog, MessageBoxOptions, MenuItemConstructorOptions } from 'electron'
import { join, dirname } from 'path'
import { v4 } from 'uuid'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { default_settings } from '../renderer/src/stores/defaults.js'
import { readCollection, writeCollection, writeCollectionCSV, readDeck, writeTTS, readTTS, readCompact } from '../renderer/src/utils/formats.js'
import { installAddon, deinstallAddon } from './updater.js'
import { DraftRecommender } from './predictors.js'
import fs from 'fs-extra'
import axios from 'axios'
import { SafeStore } from './safe-store'

const resources_path = is.dev ? join(__dirname, '../../resources') : join(process.resourcesPath, 'app.asar.unpacked', 'resources')
let card_data = JSON.parse(fs.readFileSync(join(resources_path, 'data.json'), 'utf8'))
const card_const = JSON.parse(fs.readFileSync(join(resources_path, 'const.json'), 'utf8'))
const feature_names = JSON.parse(fs.readFileSync(join(resources_path, 'features.json'), 'utf8'))
const draft_predictor = new DraftRecommender(card_data, feature_names)

const addon_names : string[] = []
fs.readdirSync(resources_path).filter(file => file.startsWith('addon') && file.endsWith('.json')).forEach(addon_name => {
  addon_names.push(addon_name)
})

card_data = card_data.flatMap((card) => {
  const promos = card["promos"] || []
  const ret = [{...card, alt: "", altto: null}]
  for (const alt of card["alts"]) {
    ret.push({ ...card, id: `${card["id"]}${alt}`, altto: card["id"], alt: alt, prints: {}, promo: promos.includes(alt), ban: card["ban"] ? card["ban"][alt] : false })
  }
  if(card["ban"]) ret[0]["ban"] = card["ban"][""]
  return ret
})

const path = require('path')
const tar = require('tar')
const jsQR = require('jsqr')
const jpeg = require('jpeg-js')
const os = require('os')

// ==============================
// STORES (SafeStore для всех 4-х)
// ==============================

const stores = {
  settings: new SafeStore<any>({
    name: 'user_settings',
    rootKey: 'settings',
    defaults: { settings: default_settings },
    serialize: is.dev ? (value) => JSON.stringify(value, null, ' ') : JSON.stringify,
    migrations: {
      '5.0.9': (store) => {
        if(!store.has("settings.draft_options.user_uuid")) store.set("settings.draft_options.user_uuid", v4())
      },
      '5.2.1': (store) => {
        if(!store.has("settings.draft_options.draft_key")) store.set("settings.draft_options.draft_key", "")
        if(!store.has("settings.draft_options.last_draft_key")) store.set("settings.draft_options.last_draft_key", "")
        if(!store.has("settings.draft_options.new_draft_key")) store.set("settings.draft_options.new_draft_key", "")
      },
      '5.2.2': (store) => {
        if(!store.has("settings.draft_options.last_full_draft")) store.set("settings.draft_options.last_full_draft", null)
      },
      '5.2.3': (store) => {
        store.set("settings.draft_options.last_draft_key", [])
      },
      '6.2.0': (store) => {
        store.set("settings.other_options.screenshot_size", 1)
        store.set("settings.other_options.screenshot_quality", 98)
        store.set("settings.other_options.collection_all_filters", false)
      },
      '6.4.0': (store) => {
        store.set("settings.draft_new_options", default_settings["draft_new_options"])
      }
    }
  })
} as any

const settings_obj = stores.settings.get() || {}
const settings_path: string | undefined = settings_obj.settings_path
let testing_mode = false

// 2) остальные сторы — уже с cwd из настроек (если задан)
stores.cards = new SafeStore<any>({
  name: 'user_cards',
  rootKey: 'cards',
  cwd: settings_path ? settings_path : undefined,
  defaults: { cards: {} },
  serialize: is.dev ? (value) => JSON.stringify(value, null, ' ') : JSON.stringify
})

stores.featured = new SafeStore<any>({
  name: 'featured',
  rootKey: 'featured',
  cwd: settings_path ? settings_path : undefined,
  defaults: { featured: {"": []} },
  serialize: is.dev ? (value) => JSON.stringify(value, null, ' ') : JSON.stringify
})

stores.decks = new SafeStore<any>({
  name: 'user_decks',
  rootKey: 'decks',
  cwd: settings_path ? settings_path : undefined,
  defaults: { decks: { decks: [] } },
  serialize: is.dev ? (value) => JSON.stringify(value, null, ' ') : JSON.stringify,
  migrations: {
    '0.4.0': (store) => store.clear(),
    '0.9.1': (store) => {
      store.set("decks.tags", ["Избранное", "В работе", "Констрактед", "Драфт", "Силед", "Импорт", "Эксперимент", "Фан", "Архив"])
      const decks = (store.get("decks.decks") as any[]) || [];
      decks.forEach((deck: any) => {
        const matches = /\{.*?\}\sот\s(\d{2}-\d{2}-\d{4})/.exec(deck['name']);
        let timestamp: number;
        if (matches && matches.length > 1) {
          const dateParts = matches[1].split('-');
          timestamp = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0])).getTime();
        } else timestamp = Date.now();
        deck['date'] = timestamp;
        deck['tags'] = [];
        if (deck['name'].toLocaleLowerCase().indexOf('драфт') > -1) deck['tags'].push('Драфт')
        else if (deck['name'].toLocaleLowerCase().indexOf('силед') > -1) deck['tags'].push('Силед')
        else deck['tags'].push('Констрактед')
        if ((deck['cards'] || []).length < 30) deck['tags'].push('В работе')
      });
      store.set("decks.decks", decks)
    },
    '6.6.0': (store) => {
      const decks = (store.get("decks.decks") as any[]) || [];
      decks.forEach((deck: any) => {
        deck['side'] = []
      })
      store.set("decks.decks", decks)
    },
  },
})

// Архивация json’ов рядом с settings
createArchive(settings_path || dirname(stores.settings.path))

// Рассылка изменений (аналог старых watcher’ов, но безопасно)
stores.cards.onChange((val: any) => {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('refresh', val, null, null)
  })
})
stores.featured.onChange((val: any) => {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('refresh', null, val, null)
  })
})
stores.decks.onChange((val: any) => {
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('refresh', null, null, val)
  })
})

let mainWindow: BrowserWindow | null = null
let pendingDeepLink: string | null = null

function handleDeepLink(url: string) {
  pendingDeepLink = url
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    mainWindow.webContents.send('deeplink', pendingDeepLink)
    pendingDeepLink = null
  }
}

function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null || typeof source !== 'object' || source === null)
    return source;
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (typeof source[key] === 'object' && source[key] !== null) {
        if (!target[key]) target[key] = Array.isArray(source[key]) ? [] : {}
        deepMerge(target[key], source[key])
      } else {
        target[key] = source[key]
      }
    }
  }
  return target;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    show: false,
    autoHideMenuBar: process.platform === 'darwin',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Гарантированная доставка deeplink после загрузки UI
  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingDeepLink) {
      mainWindow!.webContents.send('deeplink', pendingDeepLink)
      pendingDeepLink = null
    }
  })
}

function registerProtocol() {
  const scheme = 'berserknxt'
  if (!is.dev) {
    app.setAsDefaultProtocolClient(scheme)
    return
  }
  if (process.platform === 'win32') {
    const exe = process.execPath
    const exeArgs = [path.resolve(process.argv[1] || '')].filter(Boolean)
    app.setAsDefaultProtocolClient(scheme, exe, exeArgs)
  } else {
    app.setAsDefaultProtocolClient(scheme)
  }
}

// macOS: ловим deep-link ещё до ready, иначе событие теряется при холодном старте
if (process.platform === 'darwin') {
  app.on('will-finish-launching', () => {
    app.on('open-url', (event, url) => {
      event.preventDefault()
      handleDeepLink(url)
    })
  })
}

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  console.log("Second instance")
  if(!is.dev) app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const urlArg = argv.find(a => typeof a === 'string' && a.startsWith('berserknxt://'))
    if (urlArg) handleDeepLink(urlArg)
  })
}

app.whenReady().then(async () => {
  // Важно: AppUserModelID должен совпадать с build.appId (electron-builder)
  electronApp.setAppUserModelId('ru.berserknxt.app')
  registerProtocol()

  optimizer;
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('get-cards', (event) => {
    event.returnValue = card_data
  })

  ipcMain.on('get-consts', (event) => {
    event.returnValue = card_const
  })

  ipcMain.on('get-data', (event, key) => {
    if (key === 'settings') {
      event.returnValue = stores.settings.get()
      return
    }
    const s = (stores as any)[key]
    const value = s?.get?.() ?? null
    event.returnValue = value
  })

  ipcMain.on('set-data', (event, key, value) => {
    if (key === 'settings') {
      stores.settings.setQueued(value)
      event.returnValue = null
      return
    }
    const s = (stores as any)[key]
    if (s?.setQueued) {
      s.setQueued(value)
    }
    event.returnValue = null
  })

  ipcMain.on('save-deck', (event, deck, name, type, deck_type, full_deck, sign_key, side = []) => {
    if(type === 'tts') exportDeckTTS(deck, name, deck_type, full_deck, sign_key, side)
    else exportDeck(deck, name, type, side)
    event.returnValue = null
  })

  ipcMain.on('load-deck', (event) => {
    importDeck()
    event.returnValue = null
  })

  function isAllowedDeckUrl(u: string) {
    try {
      const x = new URL(u)
      return x.protocol === 'https:' && (x.hostname === 'proberserk.ru' || x.hostname === 'pro.berserk-nxt.ru')
    } catch { return false }
  }

  ipcMain.handle('download-deck', async (_event, url) => {
    if (!isAllowedDeckUrl(url)) throw new Error('Blocked URL')
    const response = await axios.get(url)
    return response.data
  })

  ipcMain.on('new-collection', (_event) => {
    resetCollection()
  })

  ipcMain.on('save-collection', (_event) => {
    saveCollection()
  })

  ipcMain.on('reset-selected', (_event) => {
    resetSelected()
  })

  ipcMain.on('export-selected', (_event) => {
    exportCollection('proberserk', ['txt'], true)
  })

  ipcMain.on('print-decklists', (_event, data) => {
    printDeckLists(data)
  })

  ipcMain.on('export-to-csv', (_event) => {
    exportToCSV()
  })

  ipcMain.on('start-tour', (_event) => {
    runHelp()
  })

  ipcMain.on('load-collection', (_event, result, reset, minus) => {
    if(result === null) loadCollection('Открыть коллекцию', reset, minus)
    else {
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('refresh', result, null);
      });
    }
  })

  ipcMain.on('save-draft', (event, _, draft, name) => {
    event.returnValue = exportDraft(draft, name)
  })

  ipcMain.on('load-draft', (event) => {
    event.returnValue = importDraft()
  })

  ipcMain.on('start-draft', (_event, _, result) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('start-draft', result);
    });
  })

  ipcMain.on('get-version', (event) => {
    event.returnValue = app.getVersion()
  })

  ipcMain.on('get-isweb', (event) => {
    event.returnValue = false
  })

  ipcMain.on('get-is-testing', (event) => {
    event.returnValue = testing_mode
  })

  ipcMain.handle('confirm-dialog', async (_event, title, message, buttons = ["Отменить", "Да"]) => {
    const response = await dialog.showMessageBox({
      type: 'question',
      buttons: buttons,
      defaultId: 0,
      cancelId: 0,
      title: title,
      message: message
    })
    return response.response
  })

  ipcMain.handle('predict-pick', async (_event, deck, choices) => {
    try {
      return await draft_predictor.predict(deck, choices)
    } catch (e) {
      console.log("Error start deck_predictor", e);
      return null
    }
  })

  ipcMain.on('get-haspredictor', (event) => {
    // @ts-ignore
    event.returnValue = !!(draft_predictor as any).session
  })

  ipcMain.on('get-deeplink', (event) => {
    event.returnValue = pendingDeepLink || ""
    pendingDeepLink = null
  })

  if (process.platform === 'win32') {
    const urlArg = process.argv.find(a => typeof a === 'string' && a.startsWith('berserknxt://'))
    if (urlArg) pendingDeepLink = urlArg
  }

  createWindow()
  try {
    await draft_predictor.init(join(resources_path, 'draft_predictor.onnx'))
  } catch (e) {
    console.log("Error start predictors", e);
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', async () => {
  try { await (stores.cards as SafeStore).close() } catch {}
  try { await (stores.decks as SafeStore).close() } catch {}
  try { await (stores.featured as SafeStore).close() } catch {}
  try { await (stores.settings as SafeStore).close() } catch {}
})

// ==============================
// Меню
// ==============================

let submenuTemplate : MenuItemConstructorOptions[] = [
  { label: 'Перезагрузить приложение', role: 'reload' },
  { label: 'Открыть DevTools', role: 'toggleDevTools' },
  { type: 'separator' },
  { label: 'Указать путь к настройкам', click: selectFolder },
  { label: 'Посмотреть резервные копии', click: () => { shell.openPath(settings_path || dirname(stores.settings.path))} },
  { label: 'Сбросить настройки', click: resetSettings },
]

submenuTemplate.push({ type: 'separator' })
let testingModeItem: any = { label: 'Перейти в режим тестирования', click: enableAddon }
submenuTemplate.push(testingModeItem)
submenuTemplate.push({ label: 'Добавить тестовые данные', click: patchAddon })
addon_names.map(name => {
  submenuTemplate.push({ label: `Удалить: ${name.replace(/^addon\-?(.*)\.json$/,'$1') || 'basic'}`, click: () => { removeAddon(name) } })
})
submenuTemplate.push({ type: 'separator' })
submenuTemplate.push({ label: 'Выход', role: 'quit' })

export const menuTemplate : MenuItemConstructorOptions[] = [];
menuTemplate.push({
  label: app.getName(),
  submenu: submenuTemplate
})
if (process.platform === 'darwin') {
  menuTemplate.push({
    label: 'Правка',
    role: 'editMenu'
  });
}

Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))

// ==============================
// Операции с данными / файлами
// ==============================

function resetCollection() {
  const options : MessageBoxOptions = {
    type: 'question',
    buttons: ['Да', 'Нет'],
    defaultId: 1,
    title: 'Новая коллекция',
    message: 'Вы уверены, что хотите удалить текущую коллекцию?',
    detail: 'Данное действие очистит наличие карт для всей коллекции, это действие необратимо. \
      Не забудьте сохранить текущую коллекцию, если ещё не сделали этого.',
  };

  dialog.showMessageBox(mainWindow!, options as MessageBoxOptions).then(result => {
    if (result.response === 0) {
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('refresh', {}, null);
      });
    }
  }).catch(err => {
    console.log(err);
  });
}

function resetSelected() {
  const options : MessageBoxOptions = {
    type: 'question',
    buttons: ['Да', 'Нет'],
    defaultId: 1,
    title: 'Очистить избранное',
    message: 'Вы уверены, что хотите очистить избранное коллекцию?',
    detail: 'Данное действие очистит выбор избранных коллекции, это действие необратимо.',
  };

  dialog.showMessageBox(mainWindow!, options as MessageBoxOptions).then(result => {
    if (result.response === 0) {
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('refresh', stores.cards.get(), {"": []});
      });
    }
  }).catch(err => {
    console.log(err);
  });
}

function saveCollection(selectedOnly = false) {
  const featured = (stores.featured.get() as any) || {}
  const selected = featured[""] || [];
  if(selectedOnly && (selected as any).size == 0) return;
  let result = writeCollection(stores.cards.get(), selectedOnly, selected)

  dialog.showSaveDialog({
    title: 'Сохранить коллекцию',
    defaultPath: app.getPath('downloads'),
    buttonLabel: 'Сохранить',
    filters: [
      { name: 'Берсерк файлы', extensions: ['brsc'] }
    ]
  }).then(file => {
    if (!file.canceled && file.filePath) {
      fs.writeFileSync(file.filePath.toString(), result, 'utf-8');
    }
  }).catch(err => {
    console.log(err);
  });
}

function loadCollection(text, reset, minus) {
  dialog.showOpenDialog({
    title: text,
    properties: ['openFile'],
    filters: [
      { name: 'Берсерк файлы', extensions: ['brsc', 'brsd'] }
    ]
  }).then(file => {
    if (!file.canceled && file.filePaths.length > 0) {
      const settingsPath = file.filePaths[0];
      fs.readFile(settingsPath, 'utf-8', (err, data) => {
        if (err) {
          console.log('Ошибка чтения файла', err);
          return;
        }

        const result = readCollection(data, reset ? {} : (stores.cards.get() || {}), minus);

        Object.keys(result).forEach(key => {
          const counts = (result as any)[key].count;
          if (counts[""] === 0 && Object.values(counts).every((value: any) => value === 0)) {
            delete (result as any)[key];
          }
        });

        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('refresh', result, null);
        });
      });
    }
  }).catch(err => {
    console.log(err);
  });
}

function exportCollection(format, ext, selectedOnly = false) {
  const featured = stores.featured.get() as any
  const selected = featured ? (featured[""] || []) : [];
  if(selectedOnly && (selected as any).size == 0) return;

  dialog.showSaveDialog({
    title: 'Экспортировать коллекцию',
    defaultPath: app.getPath('downloads'),
    buttonLabel: 'Экспортировать',
    filters: [
      { name: 'Файл коллекции', extensions: ext }
    ]
  }).then(file => {
    if (!file.canceled) {
      let content = "",
      card_count : {[key: string]: {count: {[key : string]: number}}} = stores.cards.get()
      if(format == 'laststicker'){
        let sets: any = {}, ret : string[] = [];
        Object.entries(card_count).forEach(([id, {count}]) => {
          const setId : number = Math.round((parseInt(id))/1000 ) / 10;
          if (!sets[setId] && count[""] > 0) sets[setId] = [];
          for (let i = 0; i < count[""]; i++)
            sets[setId].push(`${(parseInt(id) % 1000)}${id.replace(/^\d+/,'')}`);
        });

        Object.entries(sets).forEach(([setId, cards]) => {
          ret.push(`Сет ${setId}`);
          ret.push((cards as string[]).join(" "));
        });
        content = ret.join("\n\n");
      } else if(format == 'proberserk') {
        const names = (card_data as any[]).reduce((acc: any, {id, name, alt}) => { if(alt == "") acc[id] = name; return acc }, {})
        let ret : string[] = [];
        Object.entries(card_count).forEach(([id, {count}]) => {
          const total = Object.values(count).reduce((sum, quantity) => sum + quantity, 0);
          if(names[id] && (!selectedOnly || (selected as any).includes(id)))
            ret.push(`${total} ${names[id].replace('ё','е').replace('Ё','Е')}`);
        });
        content = ret.join("\n");
      }

      if(file.filePath)
        fs.writeFileSync(file.filePath.toString(), content, 'utf-8');
    }
  }).catch(err => {
    console.log(err);
  });
}

function runHelp(){
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('start-tour');
  });
}

let default_save_path = app.getPath('downloads')
function exportDeck(deck, name, format, side) {
  dialog.showSaveDialog({
    title: 'Сохранить колоду',
    defaultPath: join(default_save_path, name + '.' + (format == "proberserk" ? 'txt' : 'brsd')),
    buttonLabel: 'Сохранить',
    filters: [
      format == "proberserk" ?
        { name: 'Файл ProBerserk', extensions: ['txt'] }
        : { name: 'Файл коллекции', extensions: ['brsd'] }
      ]
  }).then(file => {
    if (!file.canceled) {
      let content = "", ret : string[] = [];
      if(format == 'proberserk'){
        deck.forEach(([card, count]) => {
          ret.push(`${count} ${card.name.replace('ё','е').replace('Ё','Е')}`);
        });
        if(side.length > 0) ret.push("---side---")
        side.forEach(([card, count]) => {
          ret.push(`${count} ${card.name.replace('ё','е').replace('Ё','Е')}`);
        });
        content = ret.join("\n");
      } else {
        deck.forEach(([card, count]) => {
          ret.push(`${count} ${card.id}`);
        });
        if(side.length > 0) ret.push("---side---")
        side.forEach(([card, count]) => {
          ret.push(`${count} ${card.id}`);
        });
        content = ret.join("\n");
      }
      if(file.filePath) {
        default_save_path = dirname(file.filePath);
        fs.writeFileSync(file.filePath.toString(), `#${name}\n` + content, 'utf-8');
      }
    }
  }).catch(err => {
    console.log(err);
  });
}

function importDeck() {
  dialog.showOpenDialog({
    title: 'Загрузить колоду',
    properties: ['openFile'],
    defaultPath: default_save_path,
    filters: [
      { name: 'Берсерк файлы, ProBerserk, TTS или JPG', extensions: ['brsd', 'txt', 'html', 'json', 'jpg', 'jpeg'] },
    ]
  }).then(file => {
    if (file.canceled || file.filePaths.length == 0) return;

    const filePath = file.filePaths[0];
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.error('Ошибка чтения файла', err);
        return;
      }

      const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
      const fileNameWithExtension = filePath.substring(lastSlashIndex + 1);
      const deckFileName = fileNameWithExtension.replace(/\.[^/.]+$/, "");
      default_save_path = dirname(filePath);

      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        let code
        for (let size of [900, 600, 300, 150, 100]) {
          const image = jpeg.decode(data);
          const width = size;
          const height = size;
          const startX = 0;
          const startY = image.height - height;
          const qrData = new Uint8ClampedArray(width * height * 4);
          let idx = 0;

          for (let y = startY; y < startY + height; y++) {
            for (let x = startX; x < startX + width; x++) {
              const pixelIdx = (image.width * y + x) * 4;
              qrData[idx++] = image.data[pixelIdx];
              qrData[idx++] = image.data[pixelIdx + 1];
              qrData[idx++] = image.data[pixelIdx + 2];
              qrData[idx++] = image.data[pixelIdx + 3];
            }
          }

          code = jsQR(qrData, width, height);
          if(code) break
        }
        if (code) {
          const [deck, side] = readCompact(code.data, card_const);
          BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('new-deck', { id: v4(), name: deckFileName || "Новая колода", cards: deck, side: side, date: Date.now(), tags: ['Импорт'] });
          });
        } else {
          console.error('QR-код не найден.');
        }
      } else {
        const data_str = data.toString()
        const [deckName, result, side] = filePath.endsWith('.json') ? readTTS(card_data, data_str) : readDeck(card_data, data_str);
        if (result.length > 0) {
          BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('new-deck', { id: v4(), name: (deckName as any) || deckFileName, cards: result, side: side, date: Date.now(), tags: ['Импорт'] });
          });
        }
      }
    });
  }).catch(err => {
    console.log(err);
  });
}

function exportDeckTTS(deck, name, deck_type = 'Констрактед', full_deck=null, sign_key=null, side=[]) {
  const platform = os.platform();
  let pathsave = app.getPath('downloads')
  if (platform === 'darwin') {
    const ttspath = join(app.getPath('home'), 'Library/Tabletop Simulator/Saves/Saved Objects');
    if(fs.pathExistsSync(ttspath)) pathsave = ttspath;
  } else if (platform === 'win32') {
    const ttspath = join(app.getPath('documents'), 'My Games\\Tabletop Simulator\\Saves\\Saved Objects');
    if(fs.pathExistsSync(ttspath)) pathsave = ttspath;
  } else if (platform === 'linux') {
    const ttspath = join(app.getPath('home'), '.steam/steam/steamapps/common/Tabletop Simulator/Tabletop Simulator_Data/Saved Objects');
    if(fs.pathExistsSync(ttspath)) pathsave = ttspath;
  }

  dialog.showSaveDialog({
    title: 'Сохранить колоду',
    defaultPath: join(pathsave, name + '.json'),
    buttonLabel: 'Сохранить',
    filters: [
        { name: 'Файл экспорта TTS', extensions: ['json'] }
    ]
  }).then(async (file) => {
    if (!file.canceled) {
      const content = await writeTTS(deck, card_const['tts_options'], deck_type, full_deck, sign_key, side);
      if(file.filePath) {
        fs.writeFileSync(file.filePath.toString(), content, 'utf-8');
        fs.copyFileSync(join(resources_path, 'back.png'), file.filePath.replace(/\.json$/, '.png'));
      }
    }
  }).catch(err => {
    console.log(err);
  });
}

function selectFolder() {
  dialog.showOpenDialog({
    title: 'Выберите папку',
    defaultPath: stores.settings.path,
    properties: ['openDirectory', 'createDirectory']
  }).then(async result => {
    if (result.canceled) {
      console.log('Выбор папки отменён пользователем.');
    } else {
      try {
        const dest = result.filePaths[0]
        if(!fs.existsSync(join(dest, 'user_cards.json')))
          fs.copyFileSync(stores.cards.path, join(dest, 'user_cards.json'))
        if(!fs.existsSync(join(dest, 'user_decks.json')))
          fs.copyFileSync(stores.decks.path, join(dest, 'user_decks.json'))
        if(!fs.existsSync(join(dest, 'featured.json')))
          fs.copyFileSync(stores.featured.path, join(dest, 'featured.json'))

        await stores.settings.updateQueued((cur: any) => {
          const next = { ...(cur || {}) }
          next.settings_path = dest
          return next
        })
        console.log('Выбранная папка:', dest);
        app.relaunch();
        app.quit();
      } catch (e) {
        console.log('Ошибка:', e);
      }
    }
  }).catch(err => {
    console.error('Ошибка при выборе папки:', err);
  });
}

function createArchive(sourceDir: string) {
  fs.readdir(sourceDir, (err, files) => {
    if (err) {
      console.error('Ошибка при чтении директории:', err);
      return;
    }

    const jsonFiles = files.filter(file => file.endsWith('.json'));
    if (jsonFiles.length === 0) {
      console.log('JSON файлы не найдены.');
      return;
    }

    const backupDir = join(sourceDir, 'backups');
    fs.ensureDirSync(backupDir);
    const now = new Date();
    const timestamp = now.toISOString().replace(/[\-:T]/g, '').slice(0, -5);
    const outputFilePath = join(backupDir, `backup-${timestamp}.tgz`);

    tar.c({cwd: sourceDir, gzip: true, file: outputFilePath}, jsonFiles).then(_ => {_
      console.log(`Архив ${outputFilePath} успешно создан.`)
      manageArchives(backupDir)
    })
  });
}
function manageArchives(archivesDir: string) {
  fs.readdir(archivesDir, (err, files) => {
    if (err) throw err;

    const archiveFiles = files.filter(file => file.endsWith('.tgz'));
    if (archiveFiles.length > 10) {
      archiveFiles.sort((a, b) => fs.statSync(join(archivesDir, a)).mtime.getTime() -
        fs.statSync(join(archivesDir, b)).mtime.getTime());

      for (let i = 0; i < archiveFiles.length - 10; i++) {
        fs.unlink(join(archivesDir, archiveFiles[i]), (err) => {
          if (err) throw err;
          console.log(`Старый архив ${archiveFiles[i]} удален`);
        });
      }
    }
  });
}

function enableAddon(): void {
  const set_path = {}
  addon_names.forEach(addon_name => {
    const data_addon = JSON.parse(fs.readFileSync(join(resources_path, addon_name), 'utf8'))
    if(data_addon['cards']) card_data = (card_data as any).concat(data_addon['cards'])
    Object.keys(data_addon['const']['sets']).forEach((set_id) => {
      set_path[set_id] = data_addon['const']['tts_options']['path']
    })
    delete data_addon['const']['tts_options']['path']
    if(data_addon['const']) deepMerge(card_const, data_addon['const'])
  })
  card_const["tts_options"]["set_path"] = set_path
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.reload()
  })
  testingModeItem.label = 'Завершить режим тестирования'
  testingModeItem.click = disableAddon
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))
  testing_mode = true
}

function disableAddon(): void {
  testing_mode = false
  app.relaunch()
  app.exit()
}

function patchAddon(): void{
  dialog.showOpenDialog({
    title: 'Загрузить тестовое дополнение',
    properties: ['openFile'],
    filters: [
      { name: 'Архив ZIP', extensions: ['zip'] },
    ]
  }).then(file => {
    if (file.canceled || file.filePaths.length == 0) return
    if(installAddon(file.filePaths[0])) {
      app.relaunch()
      app.exit()
    }
  });
}

function removeAddon(name) : void {
  const response = dialog.showMessageBoxSync({
    type: 'warning',
    buttons: ['Отменить', 'Да, удалить'],
    defaultId: 0,
    cancelId: 0,
    title: 'Подтверди удаление',
    message: `Уверен, что нужно удалить дополнение: "${name.replace(/^addon\-?(.*)\.json$/,'$1') || 'basic'}"?`
  });

  if (response === 1) {
    if (deinstallAddon(name)) {
      app.relaunch()
      app.exit()
    }
  }
}

function exportDraft(draft, name) {
  return dialog.showSaveDialog({
    title: 'Сохранить драфт',
    defaultPath: join(app.getPath('downloads'), name + '.brsl'),
    buttonLabel: 'Сохранить',
    filters: [{ name: 'Файл драфта', extensions: ['brsl'] }]
  }).then(file => {
    if (!file.canceled && file.filePath)
      fs.writeFileSync(file.filePath.toString(), JSON.stringify(draft), 'utf-8');
  }).catch(err => {
    console.log(err);
  });
}

function importDraft() {
  try {
    const filePaths = dialog.showOpenDialogSync({
      title: 'Загрузить драфт',
      properties: ['openFile'],
      filters: [
        { name: 'Файл драфта', extensions: ['brsl'] },
      ],
    });

    if (!filePaths || filePaths.length === 0) return null;

    const filePath = filePaths[0];
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);

    return data;
  } catch (err) {
    console.error('Ошибка импорта драфта:', err);
    return null;
  }
}

function printDeckLists(data) {
  let swindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
  })

  const pathTmp = join(os.tmpdir(), 'nxt-print-list.html')
  fs.writeFileSync(pathTmp, data, 'utf-8');
  swindow.loadURL(`file://${pathTmp}`);
  swindow.webContents.on('dom-ready', () => {
    swindow.webContents.print({}, (success, errorType) => {
      swindow.close();
      if (!success) console.log(errorType);
    });
  });
}

function resetSettings() {
  const response = dialog.showMessageBoxSync({
    type: 'warning',
    buttons: ['Отменить', 'Да, сбросить'],
    defaultId: 0,
    cancelId: 0,
    title: 'Подтверди сброс настроек',
    message: `Уверен, что нужно сбросить настройки? (Колоды и коллекция не пострадает)`
  })

  if (response === 1) {
    const cur = stores.settings.get() || {}
    const last_draft_key = cur?.draft_options?.last_draft_key
    const next = { ...default_settings }
    if (last_draft_key !== undefined) {
      next.draft_options = { ...(next.draft_options || {}), last_draft_key }
    }
    stores.settings.setQueued(next).then(() => {
      app.relaunch()
      app.quit()
    })
  }
}

function exportToCSV() {
  const collection = stores.cards.get() as any
  const card_ref = card_data.reduce((ret, card)=> {
    ret[card.id] = card;
    return ret;
  }, {})
  const result = writeCollectionCSV(collection, card_const, (id) => { return card_ref[id] })
  dialog.showSaveDialog({
    title: 'Сохранить коллекцию',
    defaultPath: app.getPath('downloads'),
    buttonLabel: 'Сохранить',
    filters: [
      { name: 'Файлы CSV', extensions: ['csv'] }
    ]
  }).then(file => {
    if (!file.canceled && file.filePath) {
      fs.writeFileSync(file.filePath.toString(), result, 'utf-8');
    }
  }).catch(err => {
    console.log(err);
  });
}
