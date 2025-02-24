import { readCollection, writeCollection, readDeck, readTTS, readCompact, writeDeck, writeTTS } from '../../../renderer/src/utils/formats.js';
import { card_data } from './index.js';
import { v4 } from 'uuid';
import jpeg from 'jpeg-js';
import jsQR from 'jsqr';

export function newCollection() {
  if(confirm('Вы уверены, что хотите удалить текущую коллекцию?\nДанное действие очистит наличие карт для всей коллекции, это действие необратимо.'))
    window.electron.ipcRenderer.send('refresh', null, {}, null);
}

export function resetSelected() {
  if(confirm('Вы уверены, что хотите очистить избранное коллекцию?\nДанное действие очистит выбор избранных коллекции, это действие необратимо.'))
    window.electron.ipcRenderer.send('refresh', null, null, {"": new Set()});
}

export function saveCollection(selectedOnly=false) {
  const cards = window.electron.ipcRenderer.sendSync('get-data', 'cards')
  const selected = window.electron.ipcRenderer.sendSync('get-data', 'featured')[""]
  const content = writeCollection(cards, selectedOnly, new Set(selected));

  const blob = new Blob([content], {type: "text/plain;charset=utf-8"});
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = "my-collection.brsc";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function loadCollection(collection, minus = false) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.brsc,.brsd';
  fileInput.style.display = 'none'; // Скрыть input, так как он не должен отображаться

  fileInput.onchange = event => {
    const file = event.target.files[0];
    if (!file) {
      console.log('Файл не выбран');
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const result = readCollection(e.target.result, collection, minus)
      window.electron.ipcRenderer.send('refresh', null, result, null);
    }

    reader.readAsText(file);
  };

  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
}


export function exportDeck(deck, name, format) {
  const content = writeDeck(deck, format)

  const fileName = name + '.' + (format === "proberserk" ? 'txt' : 'brsd');
  const blob = new Blob(format !== "proberserk" ? [`#${name}\n` + content] : [content], {type: "text/plain;charset=utf-8"});

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function importDeck() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.brsd,.txt,.html,.jpg,.jpeg,.json';
  fileInput.style.display = 'none';

  fileInput.onchange = event => {
    const file = event.target.files[0];
    const fileName = file.name.split('\\').pop().split('/').pop().split(".").shift()

    if (!file) {
      console.log('Файл не выбран');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) {
        const data = new Uint8Array(e.target.result);
        const image = jpeg.decode(data, { useTArray: true });
        const width = 300;
        const height = 300;
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
          const result = readCompact(code.data);
          window.electron.ipcRenderer.sendSync('new-deck', null, {id: v4(), name: fileName || "Новая колода", cards: result, date: Date.now(), tags: ['Импорт']});
        } else {
          console.error('QR-код не найден.');
        }
      } else {
        const data = e.target.result;
        try {
          const [deckName, result] = file.name.endsWith('.json') ? readTTS(card_data, data) : readDeck(card_data, data)
          window.electron.ipcRenderer.sendSync('new-deck', null, {id: v4(), name: deckName || fileName || "Новая колода", cards: result, date: Date.now(), tags: ['Импорт']});
        } catch (err) {
          console.error('Ошибка при чтении файла:', err);
        }
      }
    };
    if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')) reader.readAsArrayBuffer(file)
    else reader.readAsText(file);
  };

  fileInput.click();
}

export function exportDeckTTS(deck, name, deck_type) {
  const {tts_options} = window.electron.ipcRenderer.sendSync('get-consts');
  const fileName = name + '.json';
  const blob = new Blob([writeTTS(deck, tts_options, deck_type)], {type: "text/json;charset=utf-8"});

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

export function exportDraft(draft, name) {
  const blob = new Blob([JSON.stringify(draft)], { type: 'application/json;charset=utf-8' })

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${name}.brsl`
  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

export function importDraft(callback) {
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = '.brsl'
  fileInput.style.display = 'none'

  fileInput.onchange = (event) => {
    const file = event.target.files[0]

    if (!file) {
      console.log('Файл не выбран')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const rawData = e.target.result
        const draft = JSON.parse(rawData)
        if (callback) callback(draft)
      } catch (err) {
        console.error('Ошибка при чтении или парсинге файла:', err)
      }
    };

    reader.readAsText(file)
  };

  fileInput.click()
}
