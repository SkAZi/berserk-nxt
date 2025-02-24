import { app, shell, BrowserWindow, Menu, ipcMain, dialog, MessageBoxOptions, MenuItemConstructorOptions } from 'electron'
const { autoUpdater } = require('electron-updater');
import { join, dirname } from 'path'
import { v4 } from 'uuid';
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { default_settings } from '../renderer/src/stores/defaults.js'
import { readCollection, writeCollection, readDeck, writeTTS, readTTS, readCompact } from '../renderer/src/utils/formats.js'
import { checkForUpdates, installAddon, deinstallAddon } from './updater.js'
import fs from 'fs-extra'
import axios from 'axios'

const ENABLE_AI = true

const resources_path = is.dev ? join(__dirname, '../../resources') : join(process.resourcesPath, 'app.asar.unpacked', 'resources');
let card_data = JSON.parse(fs.readFileSync(join(resources_path, 'data.json'), 'utf8'));
const card_const = JSON.parse(fs.readFileSync(join(resources_path, 'const.json'), 'utf8'));

const addon_names : string[] = []
fs.readdirSync(resources_path).filter(file => file.startsWith('addon') && file.endsWith('.json')).forEach(addon_name => {
  addon_names.push(addon_name)
  const data_addon = JSON.parse(fs.readFileSync(join(resources_path, addon_name), 'utf8'));
  if(data_addon['cards']) card_data = card_data.concat(data_addon['cards']);
  if(data_addon['const']) deepMerge(card_const, data_addon['const']);
})

const tar = require('tar');
const chokidar = require('chokidar');
const jsQR = require('jsqr');
const jpeg = require('jpeg-js');
const Store = require('electron-store');
const os = require('os');

const settings_store = new Store({
  name: 'user_settings',
  defaults: {settings: default_settings},
  serialize: is.dev ? (value) => { return JSON.stringify(value, null, ' ') } : JSON.stringify,
  migrations: {
    '0.5.5': (store) => store.clear(),
    '0.6.6': (store) => {
      const boosters = store.get("settings.draft_options.boosters_set");
      if(boosters.length == 4)
        store.set("settings.draft_options.boosters_set", [...boosters, "", ""])
    },
    '0.6.7': (store) => {
      store.set("settings.deal_options", default_settings['deal_options'])
    },
    '0.7.3': (store) => {
      if(!store.has("settings.deal_options.deck"))
        store.set("settings.deal_options.deck", [])
    },
    '0.8.1': (store) => {
      if(!store.has("settings.collection_options.icons")) store.set("settings.collection_options.icons", [])
      if(!store.has("settings.deckbuilding_options.icons")) store.set("settings.deckbuilding_options.icons", [])
    },
    '1.2.10': (store) => {
      store.set("settings.other_options", {})
    },
    '1.4.7': (store) => {
      if(!store.has("settings.draft_options.last_boosters")) store.set("settings.draft_options.last_boosters", null)
      if(!store.has("settings.draft_options.replay")) store.set("settings.draft_options.replay", false)
    },
    '1.5.0': (store) => {
      store.set("settings.draft_options.last_boosters", [null,null,null,null])
    },
    '1.6.5': (store) => {
      if(!store.has("settings.collection_options.ldb")) store.set("settings.collection_options.ldb", [])
      if(!store.has("settings.deckbuilding_options.ldb")) store.set("settings.deckbuilding_options.ldb", [])
    },
    '1.6.7': (store) => {
      store.set("settings.collection_options.ldb", [])
      store.set("settings.deckbuilding_options.ldb", [])
    },
    '1.7.1': (store) => {
      if(!store.has("settings.deckbuilding_options.useCardPool")) store.set("settings.deckbuilding_options.useCardPool", false)
      if(!store.has("settings.deckbuilding_options.cardPoolName")) store.set("settings.deckbuilding_options.cardPoolName", "")
      if(!store.has("settings.deckbuilding_options.cardPool")) store.set("settings.deckbuilding_options.cardPool", [])
    },
    '1.7.4': (store) => {
      if(!store.has("settings.draft_options.their_cards")) store.set("settings.deckbuilding_options.their_cards", Array.from({ length: 16 }, () => []))
      if(!store.has("settings.draft_options.look_at")) store.set("settings.deckbuilding_options.look_at", null)
    }
  }
})

const settings_path = settings_store.get('settings.settings_path')
createArchive(settings_path || dirname(settings_store.path))

const stores = {
  'cards': new Store({
    name: 'user_cards',
    cwd: settings_path ? settings_path : undefined,
    defaults: {cards: {}},
    serialize: is.dev ? (value) => { return JSON.stringify(value, null, ' ') } : JSON.stringify,
    migrations: {
      '0.4.0': (store) => store.clear(),
    }
  }),
  'featured': new Store({
    name: 'featured',
    cwd: settings_path ? settings_path : undefined,
    defaults: {featured: {"": []}},
    serialize: is.dev ? (value) => { return JSON.stringify(value, null, ' ') } : JSON.stringify
  }),
  'decks':  new Store({
    name: 'user_decks',
    cwd: settings_path ? settings_path : undefined,
    defaults: {decks: {decks: []}},
    serialize: is.dev ? (value) => { return JSON.stringify(value, null, ' ') } : JSON.stringify,
    migrations: {
      '0.4.0': (store) => store.clear(),
      '0.9.1': (store) => {
        store.set("decks.tags", ["Избранное", "В работе", "Констрактед", "Драфт", "Силед", "Импорт", "Эксперимент", "Фан", "Архив"])
        const decks = store.get("decks.decks");
        decks.forEach((deck) => {
          const matches = /\{.*?\}\sот\s(\d{2}-\d{2}-\d{4})/.exec(deck['name']);
          let timestamp;
          if (matches && matches.length > 1) {
            const dateParts = matches[1].split('-');
            timestamp = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0])).getTime();
          } else timestamp = Date.now();
          deck['date'] = timestamp;
          deck['tags'] = [];
          if(deck['name'].toLocaleLowerCase().indexOf('драфт') > -1) deck['tags'].push('Драфт')
          else if(deck['name'].toLocaleLowerCase().indexOf('силед') > -1) deck['tags'].push('Силед')
          else deck['tags'].push('Констрактед')
          if(deck['cards'].length < 30) deck['tags'].push('В работе')

        });
        store.set("decks.decks", decks);
      },
    }
  }),
  'settings': settings_store
}

const watchers = {
  'cards': {
    'watchers': chokidar.watch(stores['cards'].path, {
        ignoreInitial: true,
        awaitWriteFinish: true
    }).on('change', _path => {
      if(watchers['cards']['updating'])
        setTimeout(()=> watchers['cards']['updating'] = false, 100)
      else
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('refresh', stores['cards'].get('cards'), null, null);
        })
    }),
    'updating': false
  },
  'decks': {
    'watchers': chokidar.watch(stores['decks'].path, {
        ignoreInitial: true,
        awaitWriteFinish: true
    }).on('change', _path => {
      if(watchers['decks']['updating'])
        setTimeout(()=> watchers['decks']['updating'] = false, 100)
      else
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('refresh', null, null, stores['decks'].get('decks'));
        })
    }),
    'updating': false
  },
  'featured': {
    'watchers': chokidar.watch(stores['featured'].path, {
      ignoreInitial: true,
      awaitWriteFinish: true
    }).on('change', _path => {
      if(watchers['featured']['updating'])
        setTimeout(()=> watchers['featured']['updating'] = false, 100)
      else
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('refresh', null, stores['featured'].get('featured'), null);
        })
    }),
    'updating': false
  },
}

let child
if (stores['settings'].get('settings.other_options.ai')) {
  let executable = join(resources_path, 'server')
  if (process.platform === 'win32') executable = join(resources_path, 'server.exe')
  if (executable && fs.existsSync(executable)) {
    const { spawn } = require('child_process')
    try {
      child = spawn(executable, [], { detached: true, cwd: resources_path })
      child.stdout.on('data', (_data) => {  })
      child.stderr.on('data', (data) => { console.log(`Tugodum AI> ${data}`) })
      child.unref()
    } catch (e) {
      console.log('Error starting AI', e)
    }
  }
}

let mainWindow;

function deepMerge(target: object, source: object): object {
  if (typeof target !== 'object' || target === null || typeof source !== 'object' || source === null)
    return source;

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null) {
        if (!target[key]) target[key] = Array.isArray(source[key]) ? [] : {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
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
    mainWindow.show()
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
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.electron')

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
    let value = stores[key].get(key)
    event.returnValue = value
  })

  ipcMain.on('set-data', (event, key, value) => {
    if(key in watchers) watchers[key]['updating'] = true;
    stores[key].set(key, value)
    event.returnValue = null
  })

  ipcMain.on('save-deck', (event, deck, name, type, deck_type) => {
    if(type === 'tts') exportDeckTTS(deck, name, deck_type)
    else exportDeck(deck, name, type)
    event.returnValue = null
  })

  ipcMain.on('load-deck', (event) => {
    importDeck()
    event.returnValue = null
  })

  ipcMain.handle('download-deck', async (_event, url) => {
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
    exportDraft(draft, name)
    event.returnValue = null
  })

  ipcMain.on('load-draft', (event) => {
    event.returnValue = importDraft()
  })

  ipcMain.on('start-draft', (_event, _, result) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('start-draft', result);
    });
  })

  createWindow()

  try{
    autoUpdater.setFeedURL({provider: 'generic', url: 'http://updates.berserk-nxt.ru/'});
    autoUpdater.checkForUpdates();
  } catch (e) {
    console.log("Error check updates", e);
  }

  if(await checkForUpdates()){
    app.relaunch()
    app.exit()
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

})

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  if(child) child.kill()
  Object.keys(watchers).forEach(key => watchers[key]['watchers'].close())
})

let submenuTemplate : MenuItemConstructorOptions[] = [
  { label: 'Перезагрузить приложение', role: 'reload' },
  { label: 'Указать путь к настройкам', click: selectFolder },
  { label: 'Посмотреть резервные копии', click: () => { shell.openPath(settings_path || dirname(settings_store.path))} }
]

if (ENABLE_AI) {
  submenuTemplate.push({ type: 'separator' })
  submenuTemplate.push({ label: 'Запускать Тугодум AI (бета)', type: 'checkbox', checked: stores['settings'].get('settings.other_options.ai'),
    click: () => {
      stores['settings'].set('settings.other_options.ai', !stores['settings'].get('settings.other_options.ai'))
      app.relaunch()
      app.exit()
    }
  })
}

submenuTemplate.push({ type: 'separator' })
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
menuTemplate.push({
 label: "Тестирование",
 submenu: [
   { label: 'Обновить приложение', role: 'reload' },
   { label: 'Открыть DevTools', role: 'toggleDevTools' },
 ]
});

//else
//menuTemplate.push({
//  label: "Тестирование",
//  submenu: [
//    { label: 'Обновить приложение', role: 'reload' },
//    { label: 'Открыть DevTools', role: 'toggleDevTools' },
//    { type: 'separator' },
//    { label: 'Выход', role: 'quit' }
//  ]
//});

/* menuTemplate.push({
  label: 'Коллекция',
  submenu: [
    { label: 'Новая коллекция...', click: resetCollection },
    { label: 'Загрузить коллекцию...', click: () => { loadCollection('Открыть коллекцию', true, false); } },
    { label: 'Сохранить как...', click: () => { saveCollection(false) } },
    { label: 'Экспорт', submenu: [
      {label: 'ProBerserk', click: () => { exportCollection('proberserk', ['txt']) }},
      {label: 'LastSticker', click: () => { exportCollection('laststicker', ['txt']) }},
      ]},
    { type: 'separator' },
    { label: 'Добавить в коллекцию', click:  () => { loadCollection('Добавить в коллекцию', false, false); }  },
    { label: 'Убрать из коллекции', click:  () => { loadCollection('Убрать из коллекции', false, true); }  },
    { label: 'Импорт', submenu: [
      //{label: 'LastSticker', click: () => { importCollection('laststicker', ['txt']) }},
      {label: 'ProBerserk', click: () => { importCollection('proberserk', ['txt','htm','html']) }},
      ]},
    { type: 'separator' },
    { label: 'Очистить избранное...', click: resetSelected },
    { label: 'Сохранить избранное', click: () => { saveCollection(true) } },
    { label: 'Экспорт избранного', submenu: [
      {label: 'ProBerserk', click: () => { exportCollection('proberserk', ['txt'], true) }},
      ]},
    ]
});

if(process.platform === 'darwin')
  menuTemplate.push({
    label: 'Правка',
    role: 'editMenu'
  }, {
    label: 'Помощь',
    submenu: [
      { label: 'Отобразить подсказку', click: runHelp },
    ]
  });
else
  menuTemplate.push({
    label: 'Помощь', click: runHelp
  });
 */

Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

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

  dialog.showMessageBox(mainWindow, options as MessageBoxOptions).then(result => {
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

  dialog.showMessageBox(mainWindow, options as MessageBoxOptions).then(result => {
    if (result.response === 0) {
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('refresh', stores['cards'].get("cards"), {"": []});
      });
    }
  }).catch(err => {
    console.log(err);
  });
}

function saveCollection(selectedOnly = false) {
  const selected = stores['featured'].get("featured")[""] || [];
  if(selectedOnly && selected.size == 0) return;
  let result = writeCollection(stores['cards'].get("cards"), selectedOnly, selected)

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

        const result = readCollection(data, reset ? {} : (stores['cards'].get("cards") || {}), minus);

        Object.keys(result).forEach(key => {
          const counts = result[key].count;
          if (counts[""] === 0 && Object.values(counts).every(value => value === 0)) {
            delete result[key];
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
  const featured = stores['featured'].get("featured")
  console.log(featured)
  const selected = featured ? (featured[""] || []) : [];
  if(selectedOnly && selected.size == 0) return;

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
      card_count : {[key: string]: {count: {[key : string]: number}}} = stores['cards'].get('cards')
      if(format == 'laststicker'){
        let sets = {}, ret : string[] = [];
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
        const names = card_data.reduce((acc, {id, name, alt}) => { if(alt == "") acc[id] = name; return acc }, {})
        let ret : string[] = [];
        Object.entries(card_count).forEach(([id, {count}]) => {
          const total = Object.values(count).reduce((sum, quantity) => sum + quantity, 0);
          if(names[id] && (!selectedOnly || selected.includes(id)))
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

//function importCollection(format, ext) {
//  dialog.showOpenDialog({
//    title: 'Импортировать в коллекцию',
//    properties: ['openFile'],
//    filters: [
//      { name: 'Текстовые файлы', extensions: ext }
//    ]
//  }).then(file => {
//    if (!file.canceled && file.filePaths.length > 0) {
//      fs.readFile(file.filePaths[0], 'utf-8', (err, data) => {
//        if (err) {
//          console.error('Ошибка чтения файла', err);
//          return;
//        }
//
//        let result;
//        if (format === 'proberserk') {
//          const names = card_data.reduce((acc, {id, name, alt}) => { if(alt == "") acc[name.toLowerCase().replace('ё','е')] = id; return acc }, {});
//          result = data.split('\n').reduce((acc, line) => {
//            if(line[0] == "#") return;
//            const [total, ...name] = line.trim().replace('<br>','').toLowerCase().replace('ё','е').split(' ');
//            const id = names[name.join(' ')];
//            if (!id) return acc;
//            if (!acc[id]) acc[id] = { count: {"": 0} };
//            acc[id].count[''] += parseInt(total, 10);
//            return acc;
//          }, stores['cards'].get("cards") || {});
//
//        } else {
//          console.error('Неизвестный формат файла');
//          return;
//        }
//
//        stores['cards'].set("cards", result);
//        BrowserWindow.getAllWindows().forEach(win => {
//          win.webContents.send('refresh', result, null);
//        });
//      });
//    }
//  }).catch(err => {
//    console.error(err);
//  });
//}

function runHelp(){
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('start-tour');
  });
}


function exportDeck(deck, name, format) {
  dialog.showSaveDialog({
    title: 'Сохранить колоду',
    defaultPath: join(app.getPath('downloads'), name + '.' + (format == "proberserk" ? 'txt' : 'brsd')),
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
        content = ret.join("\n");
      } else {
        deck.forEach(([card, count]) => {
          ret.push(`${count} ${card.id}`);
        });
        content = ret.join("\n");
      }
      if(file.filePath)
        fs.writeFileSync(file.filePath.toString(), `#${name}\n` + content, 'utf-8');
    }
  }).catch(err => {
    console.log(err);
  });
}

function importDeck() {
  dialog.showOpenDialog({
    title: 'Загрузить колоду',
    properties: ['openFile'],
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

      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        const image = jpeg.decode(data);
        const width = 600;
        const height = 600;
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

        const code = jsQR(qrData, width, height);
        if (code) {
          const deck = readCompact(code.data, card_const);
          BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('new-deck', { id: v4(), name: deckFileName || "Новая колода", cards: deck, date: Date.now(), tags: ['Импорт'] });
          });
        } else {
          console.error('QR-код не найден.');
        }
      } else {
        const data_str = data.toString()
        const [deckName, result] = filePath.endsWith('.json') ? readTTS(card_data, data_str) : readDeck(card_data, data_str);
        if (result.length > 0) {
          BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('new-deck', { id: v4(), name: deckName || deckFileName, cards: result, date: Date.now(), tags: ['Импорт'] });
          });
        }
      }
    });
  }).catch(err => {
    console.log(err);
  });
}



function exportDeckTTS(deck, name, deck_type = 'Констрактед') {
  const platform = os.platform();
  let path = app.getPath('downloads')
  if (platform === 'darwin') {
    const ttspath = join(app.getPath('home'), 'Library/Tabletop Simulator/Saves/Saved Objects');
    if(fs.pathExistsSync(ttspath)) path = ttspath;
  } else if (platform === 'win32') {
    const ttspath = join(app.getPath('documents'), 'My Games\\Tabletop Simulator\\Saves\\Saved Objects');
    if(fs.pathExistsSync(ttspath)) path = ttspath;
  } else if (platform === 'linux') {
    const ttspath = join(app.getPath('home'), '.steam/steam/steamapps/common/Tabletop Simulator/Tabletop Simulator_Data/Saved Objects');
    if(fs.pathExistsSync(ttspath)) path = ttspath;
  }

  dialog.showSaveDialog({
    title: 'Сохранить колоду',
    defaultPath: join(path, name + '.json'),
    buttonLabel: 'Сохранить',
    filters: [
        { name: 'Файл экспорта TTS', extensions: ['json'] }
    ]
  }).then(file => {
    if (!file.canceled) {
      const content = writeTTS(deck, card_const['tts_options'], deck_type);
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
    defaultPath: settings_store.path,
    properties: ['openDirectory', 'createDirectory']
  }).then(result => {
    if (result.canceled) {
      console.log('Выбор папки отменён пользователем.');
    } else {
      try {
        if(!fs.existsSync(join(result.filePaths[0], 'user_cards.json')))
          fs.copyFileSync(stores['cards'].path, join(result.filePaths[0], 'user_cards.json'))
        if(!fs.existsSync(join(result.filePaths[0], 'user_decks.json')))
          fs.copyFileSync(stores['decks'].path, join(result.filePaths[0], 'user_decks.json'))
        if(!fs.existsSync(join(result.filePaths[0], 'featured.json')))
          fs.copyFileSync(stores['featured'].path, join(result.filePaths[0], 'featured.json'))
        settings_store.set('settings.settings_path', result.filePaths[0]);
        console.log('Выбранная папка:', result.filePaths[0]);
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

function createArchive(sourceDir) {
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
function manageArchives(archivesDir) {
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
  dialog.showSaveDialog({
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

  const path = join(os.tmpdir(), 'nxt-print-list.html')
  fs.writeFileSync(path, data, 'utf-8');
  swindow.loadURL(`file://${path}`);
  swindow.webContents.on('dom-ready', () => {
    swindow.webContents.print({}, (success, errorType) => {
      swindow.close();
      if (!success) console.log(errorType);
    });
  });

  // dialog.showSaveDialog({
  //   title: 'Сохранить деклист',
  //   defaultPath: app.getPath('downloads'),
  //   buttonLabel: 'Сохранить',
  //   filters: [
  //     { name: 'HTML для печати', extensions: ['html'] }
  //   ]
  // }).then(file => {
  //   if (!file.canceled && file.filePath) {
  //     fs.writeFileSync(file.filePath.toString(), data, 'utf-8');
  //   }
  // }).catch(err => {
  //   console.log(err);
  // });
}
