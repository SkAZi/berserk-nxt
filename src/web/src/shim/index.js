import { Store } from './store.js';

import { default_settings } from '../../../renderer/src/stores/defaults.js';
import { newCollection, saveCollection, loadCollection, exportDeck, importDeck, exportDeckTTS, resetSelected } from './files.js';

import cardConst from '../../../../resources/const.json';
import cardsStore from '../../../../resources/data.json';

const resourcesPath = "/assets";

export const card_data = cardsStore;

export const api = {
  resoucesPath: resourcesPath
};

export const electron = {
  ipcRenderer: (function() {
    const listeners = new Map();

    return {
      on(channel, listener) {
        let channelListeners = listeners.get(channel);
        if (!channelListeners) {
          channelListeners = [];
          listeners.set(channel, channelListeners);
        }
        channelListeners.push(listener);
        },
      sendSync(channel, ...args) {
        if (listeners.has(channel)) {
          const channelListeners = listeners.get(channel);
          let result = null;
          channelListeners.forEach(listener => {
            result = listener(...args);
          });
          return result;
        }
        return null;
        },
      send(channel, ...args) {
          const result = this.sendSync(channel, ...args)
          return new Promise((resolve, reject) => {
            resolve(result);
          });
        },
      removeAllListeners(channel = null) {
        if (channel) {
          listeners.delete(channel);
        } else {
          listeners.clear();
        }
      }
    };
  })()
};

if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  const preloader = document.createElement('div');
  preloader.id = 'source_loader';
  preloader.innerHTML = "<h2>Подожди немного...<br /><br /><em>мне надо всё тщательно закешировать</em>.</h2>"
  document.body.appendChild(preloader);

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).then(function(registration) {
      console.log('Сервис-воркер зарегистрирован: ', registration.scope);
      if (navigator.serviceWorker.controller)
        navigator.serviceWorker.controller.postMessage({type: 'GET_CACHE_STATUS'});
      return navigator.serviceWorker.ready;
    })
    .then(reg => {
      console.log('Сервис-воркер готов:', reg);
      preloader.remove();
    })
    .catch(function(err) {
      console.error('Не удалось зарегистрировать сервис-воркер:', err);
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Страница под контролем воркера:', navigator.serviceWorker.controller);
    navigator.serviceWorker.controller.postMessage({type: 'GET_CACHE_STATUS'});
  });

  navigator.serviceWorker.addEventListener('message', event => {
    const { message, status } = event.data;
    console.log(message);

    if (status === 'success') {
      preloader.remove()
    }

    if (status === 'failed') {
      console.error('Кеширование невозможно', event.data.error);
    }
  });
}

window.api = api;
window.electron = electron;

const stores = {
  'cards': new Store({
    name: 'user_cards',
    defaults: {cards: {}},
    migrations: {
      '0.4.0': (store) => store.clear(),
    }
  }),
  'featured': new Store({
    name: 'featured',
    defaults: {featured: {"": []}},
  }),
  'decks':  new Store({
    name: 'user_decks',
    defaults: {decks: {decks: []}},
    migrations: {
      '0.4.0': (store) => store.clear(),
      '0.9.2': (store) => {
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
    },
  }),
  'settings': new Store({
    name: 'user_settings',
    defaults: {settings: default_settings},
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
    }
  })
};


window.electron.ipcRenderer.on('refresh', (_, result, featured) => {
  if(result) stores['cards'].set("cards", result);
  if(featured) stores['featured'].set("featured", result);
  return stores['cards'].get("cards")
});

window.electron.ipcRenderer.on('get-cards', () => {
  return cardsStore
});

window.electron.ipcRenderer.on('get-consts', () => {
  return cardConst
});

window.electron.ipcRenderer.on('get-data', (key) => {
  return stores[key].get(key)
});

window.electron.ipcRenderer.on('set-data', (key, value) => {
  stores[key].set(key, value)
  return null
});


window.electron.ipcRenderer.on('save-deck', (deck, name, type) => {
  if(type === 'tts') exportDeckTTS(deck, name)
  else exportDeck(deck, name, type)
});

window.electron.ipcRenderer.on('load-deck', () => {
  importDeck()
});

window.electron.ipcRenderer.on('new-collection', () => {
  newCollection()
})

window.electron.ipcRenderer.on('save-collection', () => {
  saveCollection()
})

window.electron.ipcRenderer.on('reset-selected', () => {
  resetSelected()
})

window.electron.ipcRenderer.on('export-selected', () => {
  saveCollection(true)
})

window.electron.ipcRenderer.on('load-collection', (result, reset, minus) => {
  if(result === null) loadCollection(reset ? {} : stores['cards'].get("cards"), minus)
  else window.electron.ipcRenderer.send('refresh', null, result, null)
})