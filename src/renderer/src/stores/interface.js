import { writable } from 'svelte/store';

export const popupStore = writable({
  isOpen: false,
  card: null,
  deck: null,
  card_list: []
});

export function togglePopup(card, card_list, type = 'card') {
  popupStore.update(($popupStore) => {
    return { isOpen: !$popupStore.isOpen, card: type === 'card' ? card : null, deck: type === 'deck' ? card : null, card_list: card_list }
  })
}

export const filterAside = writable({
  isOpen: true
})

export function toggleAside(on) {
  filterAside.update(($filterAside) => {
    const aside = (on === true) ? true : (on === false) ? false : !$filterAside.isOpen;
    return {...$filterAside, isOpen: aside}
  })
}

export const showStats = writable({
  isOpen: false
})

export function toggleStats(on) {
  showStats.update(($showStats) => {
    const aside = (on === true) ? true : (on === false) ? false : !$showStats.isOpen;
    return {...$showStats, isOpen: aside}
  })
}

export const currentDeck = writable({
  deck_id: null,
  show_full: false
})

export function setDeckId(deck_id) {
  currentDeck.update(($currentDeck) => {
    return {...$currentDeck, deck_id: deck_id}
  })
}

export function toggleFullDeck(value) {
  currentDeck.update(($currentDeck) => {
    return {...$currentDeck, show_full: value === null ? value : !$currentDeck.show_full}
  })
}

export const secondLevelMenu = writable({
  menu: []
})

export function setSecondLevelMenu(menu) {
  secondLevelMenu.update(($secondLevelMenu) => {
    return {...$secondLevelMenu, menu: menu || []}
  })
}

export const loader = writable(true)

export const showMainMenu = writable({
  isOpen: false
})

export function toggleMainMenu(on) {
  showMainMenu.update(($showMainMenu) => {
    const aside = (on === true) ? true : (on === false) ? false : !$showMainMenu.isOpen;
    return {...$showMainMenu, isOpen: aside}
  })
}

export const deckEditMode = writable('deckbuilder')

export const aboutStore = writable({
  isOpen: false,
})

export function toggleAbout() {
  aboutStore.update(($aboutStore) => {
    return { isOpen: !$aboutStore.isOpen }
  })
}

export const printDeckListStore = writable({
  isOpen: false
})

export function togglePrintDeckList() {
  printDeckListStore.update(($printDeckListStore) => {
    return { isOpen: !$printDeckListStore.isOpen }
  })
}
