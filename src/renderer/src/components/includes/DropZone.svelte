<script>
  import { v4 } from 'uuid';
  import jsQR from 'jsqr';

  import { onMount } from 'svelte';
  import { readCollection, readDeck, readTTS, readCompact, rot13 } from '../../utils/formats.js';
  import { navigate } from "@jamen/svelte-router";
  import { shortcuts } from '../../utils/shortcuts.js';

  import { cardsStore } from '../../stores/cards.js';
  import { user_decks } from '../../stores/user_data.js';
  import { setDeckId } from '../../stores/interface.js';

  const isWeb = window.electron.ipcRenderer.sendSync('get-isweb')

  let isDraggingOver = false;
  let dragCounter = 0;

  // TODO: main drop, event from index
  onMount(() => {
    const handleDragOver = event => {
      if (event.dataTransfer.types.includes('Files')) {
        event.preventDefault();
      }
    };

    const handleDragEnter = event => {
      if (event.dataTransfer.types.includes('Files')) {
        dragCounter++;
        isDraggingOver = true;
      }
    };

    const handleDragLeave = _event => {
      dragCounter--;
      if (dragCounter === 0) {
        isDraggingOver = false;
      }
    };

    const handleDrop = event => {
      if (event.dataTransfer.types.includes('Files')) {
        event.preventDefault();
        dragCounter = 0;
        isDraggingOver = false;
        const files = event.dataTransfer.files;
        Array.from(files).forEach((file) => {
          if(file.name.endsWith('.brsl')) {
            const reader = new FileReader()
            reader.onload = (e) => {
              navigate('/app/draft')
              setTimeout(() => {
                window.electron.ipcRenderer.send('start-draft', null, JSON.parse(e.target.result.toString()))
              }, 50)
            }
            reader.readAsText(file)
          }
          if(file.name.endsWith('.brsc') && confirm('Вы уверены, что хотите удалить текущую коллекцию и загрузить вместо неё новую?')){
            const reader = new FileReader();
            reader.onload = (e) => {
              const collection = readCollection(e.target.result)
              window.electron.ipcRenderer.send('load-collection', collection, true, false)
            };
            reader.readAsText(file);
          }
          if(file.name.endsWith('.brsd') || file.name.endsWith('.txt') || file.name.endsWith('.html') || file.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (e) => { readAndAddDeck(file.name, e.target.result) }
            reader.readAsText(file);
          }
          if(file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const img = new Image();
                img.onload = function() {
                  let canvas = document.createElement('canvas');
                  let ctx = canvas.getContext('2d');
                  let code

                  for (let size of [900, 600, 300, 150, 100]) {
                    canvas.width = size
                    canvas.height = size
                    ctx.drawImage(img, 0, img.height - size, size, size, 0, 0, size, size)

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                    code = jsQR(imageData.data, imageData.width, imageData.height)
                    if(code) break
                  }

                  if(!code) return
                  const [deck, side] = readCompact(code.data)
                  if(deck.length > 0) {
                    user_decks.update(($user_decks) => {
                      return {...$user_decks, decks: [{id: v4(), name: file.name.split(".")[0] || "Новая колода", cards: deck, side: side, date: Date.now(), tags: ['Импорт']}, ...$user_decks['decks']]};
                    });
                    setDeckId(0)
                    navigate('/app/deckbuilder')
                  }
                }
                img.src = e.target.result.toString();
              } catch(e) {
                console.log("Ошибка чтения файла", e);
              }
            };
            reader.readAsDataURL(file);
          }
        })
      }
    }

    const handleDeeplink = async (url) => {
      if(url === '') return
      const u = new URL(url)
      if (u.hostname === 'deck') {
        const deckurl = u.searchParams.get('url')
        if(deckurl && deckurl.startsWith('https://proberserk.ru/')) {
          window.electron.ipcRenderer.invoke('download-deck', deckurl).then((response) => {
            readAndAddDeck(u.searchParams.get('name') ?? url.pathname.split('/').pop(), response)
          })
        } else {
          readAndAddDeck(u.searchParams.get('name'), u.searchParams.get('content').split(':').join('\n'))
        }
      }
    }

    window.electron.ipcRenderer.on('deeplink', (_, url) => handleDeeplink(url))
    if(!isWeb) {
      const initial = window.electron.ipcRenderer.sendSync('get-deeplink')
      handleDeeplink(initial)
    }

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      window.electron.ipcRenderer.removeAllListeners('deeplink')
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  });

  async function loadFromBuffer() {
    let content = await navigator.clipboard.readText();
    if(content.startsWith('https://proberserk.ru/')) {
      if(!content.endsWith('.txt')) content += '.txt';
      window.electron.ipcRenderer.invoke('download-deck', content).then((response) => {
        const url = new URL(content);
        readAndAddDeck(url.pathname.split('/').pop(), response)
      })
    }
    if(content.startsWith('#')) readAndAddDeck('', content)
    if(content.startsWith('--')) readAndAddDeck('', '#' + rot13(content.replace(/--#(.|\n)*$/g, '').replaceAll('--', '').replaceAll('\n', '').replaceAll('\r', '')))
  }

  function readAndAddDeck(filename, result) {
    try {
      let deckName, deck, side
      if (filename === '') [deck, side] = readCompact(result)
      else [deckName, deck, side] = filename.endsWith('.json') ?
        readTTS(cardsStore, result) : readDeck(cardsStore, result)

      if(deck.length > 0) {
        user_decks.update(($user_decks) => {
          return {...$user_decks, decks: [{id: v4(), name: deckName || filename.split(".")[0] || "Новая колода", cards: deck, side: side, date: Date.now(), tags: ['Импорт']}, ...$user_decks['decks']]};
        });
        setDeckId(0)
        navigate('/app/deckbuilder')
      }
    } catch(e) {
      console.log("Ошибка чтения файла", e);
    }
  }
</script>

<div class:dragging={isDraggingOver} class="drop-zone"
    use:shortcuts={{ keyboard: true}} on:action:paste={loadFromBuffer}>
  <slot></slot>
</div>

<style>
  .drop-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.7);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    backdrop-filter: var(--pico-modal-overlay-backdrop-filter);
    z-index: 5000;
  }

  .dragging {
    opacity: 1;
    pointer-events: all;
  }
</style>
