import Hammer from 'hammerjs'

const config = {
  click: 'action:primary',
  rightclick: 'action:preview',
  middleclick: 'action:select',
  'shift+click': 'action:plus',
  'alt+click': 'action:minus',
  'shift+wheelup': 'action:zoomin',
  'shift+wheeldown': 'action:zoomout',
  'ctrl+rightclick': 'action:select',

  tap: 'action:primary',
  doubletap: 'action:select',
  press: 'action:preview',
  pinchin: 'action:zoomout',
  pinchout: 'action:zoomin',

  '+': 'action:add',
  '-': 'action:remove',
  t: 'action:tap',
  f: 'action:flip',
  escape: 'action:close',
  enter: 'action:enter',
  backspace: 'action:delete',
  delete: 'action:delete',
  'ctrl+f': 'action:find',
  'ctrl+n': 'action:new',
  'ctrl+s': 'action:save',
  'ctrl+o': 'action:load',
  'ctrl+z': 'action:undo',
  'ctrl+v': 'action:paste',

  arrowright: 'action:next',
  arrowleft: 'action:prev'
}

export const rus = {
  й: 'q',
  ц: 'w',
  у: 'e',
  к: 'r',
  е: 't',
  н: 'y',
  г: 'u',
  ш: 'i',
  щ: 'o',
  з: 'p',
  х: '[',
  ъ: ']',
  ф: 'a',
  ы: 's',
  в: 'd',
  а: 'f',
  п: 'g',
  р: 'h',
  о: 'j',
  л: 'k',
  д: 'l',
  ж: ';',
  э: "'",
  я: 'z',
  ч: 'x',
  с: 'c',
  м: 'v',
  и: 'b',
  т: 'n',
  ь: 'm',
  б: ',',
  ю: '.',
  ё: '`'
}

const getModifiers = (event, action) => {
  return [
    event.shiftKey ? 'shift+' : '',
    event.ctrlKey || event.metaKey ? 'ctrl+' : '',
    event.altKey ? 'alt+' : '',
    rus[action] || action
  ].join('')
}

function dispatch(event, eventType, node) {
  let type = config[getModifiers(event, eventType)]
  if (type) {
    node.dispatchEvent(new CustomEvent(type, { detail: { event, node } }))
    return false
  }
  return true
}

export function shortcuts(node, options = {}) {
  let mc
  let isHovered = false

  const handleKeyDown = (event) => {
    if (options.hovered === true && !isHovered) return true
    const key = event.key.toLowerCase()
    const numKey = parseInt(key)
    if (numKey >= 0 && numKey <= 9) {
      node.dispatchEvent(
        new CustomEvent('action:number', { detail: { event, node, number: numKey } })
      )
    } else {
      if (
        key != 'enter' &&
        key != 'escape' &&
        key != 'delete' &&
        key != 'backspace' &&
        key != 'arrowleft' &&
        key != 'arrowright' &&
        key.length > 1
      )
        return true
      return dispatch(event, event.key.toLowerCase(), node)
    }
    return true
  }

  const handleMouseClick = (event) => {
    dispatch(event, 'click', node)
  }

  const handleMouseLongPress = (event) => {
    dispatch(event, 'press', node)
    event.preventDefault()
    event.stopPropagation()
    return false
  }

  const handleMouseDown = (event) => {
    let eventType = [null, 'middleclick', 'rightclick'][event.button]
    if (eventType) {
      dispatch(event, eventType, node)
      if (eventType === 'rightclick') event.preventDefault()
    }
  }

  const handleWheel = (event) => {
    let eventType = null
    if (navigator.platform.indexOf('Mac') >= 0) {
      eventType = event.deltaY < 0 ? 'wheeldown' : 'wheelup'
    } else {
      eventType = event.deltaY < 0 ? 'wheelup' : 'wheeldown'
    }
    dispatch(event, eventType, node)
    if (!options.passive && config[getModifiers(event, eventType)]) event.preventDefault()
  }

  node.style.cursor = 'pointer'
  node.classList.add('shortcuts')
  node.addEventListener('mousedown', handleMouseDown)
  node.addEventListener('wheel', handleWheel, { passive: !!options.passive })
  node.addEventListener('contextmenu', (event) => event.preventDefault())
  node.addEventListener('mouseenter', () => (isHovered = true))
  node.addEventListener('mouseleave', () => (isHovered = false))
  if (options.keyboard) document.addEventListener('keydown', handleKeyDown)

  if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0 && !options.noTap) {
    mc = new Hammer(node)

    const doubleTapRecognizer = new Hammer.Tap({
      event: 'doubletap',
      taps: 2,
      interval: 700,
      threshold: 200
    })
    const tapRecognizer = new Hammer.Tap({ event: 'tap', taps: 1 })
    tapRecognizer.requireFailure(doubleTapRecognizer)
    mc.add([doubleTapRecognizer, tapRecognizer])

    mc.get('pan').set({ pointers: 2, threshold: 30 })

    mc.on('press', handleMouseLongPress)

    mc.on('pan', (event) => {
      if (event.additionalEvent === 'panleft') {
        dispatch(event, 'pinchin', node)
      } else if (event.additionalEvent === 'panright') {
        dispatch(event, 'pinchout', node)
      }
    })

    mc.on('doubletap', (event) => {
      dispatch(event, 'doubletap', node)
    })

    mc.on('tap', (event) => {
      dispatch(event, 'tap', node)
    })
  } else if('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) {
    node.addEventListener('contextmenu', handleMouseLongPress)
    node.addEventListener('mouseup', handleMouseClick)
  } else {
    node.addEventListener('click', handleMouseClick)
  }

  return {
    destroy() {
      if (mc) {
        mc.off()
        mc.destroy()
      } else {
        node.removeEventListener('click', handleMouseClick)
      }
      node.removeEventListener('mousedown', handleMouseDown)
      node.removeEventListener('wheel', handleWheel)
      node.removeEventListener('contextmenu', (event) => event.preventDefault())
      node.removeEventListener('contextmenu', handleMouseLongPress)
      node.removeEventListener('mouseenter', () => (isHovered = true))
      node.removeEventListener('mouseleave', () => (isHovered = false))
      if (options.keyboard) document.removeEventListener('keydown', handleKeyDown)
    }
  }
}
