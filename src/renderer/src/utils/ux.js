import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { writeCompact } from './formats.js'

export function takeScreenshot(selector, name, data = null, suffix = "", clipboard = false) {
  const node = document.querySelector(selector).cloneNode(true);
  const len = Array.from(node.childNodes).length
  node.style.background = '#2a3140';
  node.style.padding = '16px 16px 0'
  node.style.marginTop = '1000px'
  node.style.width = len < 20 ? '800px' : (len <= 30 ? '900px' : '1140px')
  node.style.setProperty('--card-min-size', '120px')
  node.classList.add('print')
  const header = document.createElement('h3');
  header.innerText = name
  node.prepend(header)
  let qrText = ""
  if(data) qrText = writeCompact(data.map(([card, count]) => [count, card.set_id, card.number]))
  QRCode.toCanvas(qrText, { version: 6, width: 108, margin: 0, color: {dark: '#CFD5E2FF', light: '#00000000'} }, (err, qrCanvas) => {
    if(!err && qrText){
      qrCanvas.style.marginTop = '10px'
      qrCanvas.style.gridColumn = '1/-1';
      node.append(qrCanvas)
    }
    const footer = document.createElement('p');
    footer.style.fontSize = '75%';
    footer.style.marginTop = '-2em';
    if(suffix !== "") footer.style.paddingTop = '8px';
    footer.style.gridColumn = '1/-1';
    footer.style.textAlign = 'right';
    footer.style.color = '#3d475c';
    footer.innerText = 'ККИ Берсерк Nxt';
    node.append(footer)
    Array.from(node.querySelectorAll('.top-text')).forEach((el) => el.style.display = 'none')
    Array.from(node.querySelectorAll('.sortable')).forEach((el) => el.style.height = '')
    document.body.appendChild(node);
    html2canvas(node).then(canvas => {
      if(clipboard) {
        canvas.toBlob((blob) => {
          if (blob) {
            const clipboardItem = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([clipboardItem])
              .then(() => console.log('Скриншот сохранен в буфер обмена'))
              .catch(err => console.error('Ошибка при сохранении в буфер обмена:', err));
          }
        }, 'image/png');
      } else {
        document.body.removeChild(node);
        const dataURL = canvas.toDataURL("image/jpeg", 0.9);
        const link = document.createElement('a');
        link.download = name + suffix + '.jpg';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    })
  })
}
