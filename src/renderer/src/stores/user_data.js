import { writable } from 'svelte/store';
import { default_collection_options, default_deckbuilding_options, default_draft_options, default_deal_options} from './defaults.js';

export const settings_loaded = writable({});

export const option_set = {
  collection_options: writable(default_collection_options),
  deckbuilding_options: writable(default_deckbuilding_options),
  draft_options: writable(default_draft_options),
  deal_options: writable(default_deal_options),
};

function createElectronStore(key, loaded_keys) {
  const { subscribe, set, update: originalUpdate } = writable({});

  const value = window.electron.ipcRenderer.sendSync('get-data', key)
  set(value)
  if(key == 'settings'){
    loaded_keys.map((options_key)=> {
      option_set[options_key].set(value[options_key])
    })
  }

  settings_loaded.update(($settings_loaded) => {
    return {...$settings_loaded, [key]: true}
  });

  return {
    subscribe,
    set: (value) => {
      set(value)
      window.electron.ipcRenderer.send('set-data', key, value)
    },
    update: (updater) => {
      originalUpdate(current => {
        let updated = updater(current)
        window.electron.ipcRenderer.send('set-data', key, updated)
        return updated;
      });
    }
  };
}
export const settings = createElectronStore('settings', ['collection_options','deckbuilding_options','draft_options','deal_options']);
export const user_cards = createElectronStore('cards', ['cards']);
export const user_decks = createElectronStore('decks', ['decks']);
export const featured = createElectronStore('featured', ['featured']);

export function toggleFeatured(card){
  featured.update($featured => {
    if($featured[""].includes(card.id)) $featured[""] = $featured[""].filter(item => item !== card.id)
    else $featured[""].push(card.id)
    return {...$featured, "": $featured[""]}
  })
}
export const filteredSortedCards = writable([]);
