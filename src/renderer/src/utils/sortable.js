import { draggable } from './dragable.js'

export function sortable(node, params = {}) {
  let { update: update_function, store, key, top_offset, left_offset, swap } = params
  let holder = document.createElement('div')
  holder.classList.add('card-drop')
  let drag_index = 0

  node.classList.add('sortable')

  const { destroy: destroyDraggable } = draggable(node, {
    ...params,
    cancel: '.nodrag',
  })

  function calculateGridStep(element) {
    const parent = element.parentNode
    const gaps = parseFloat(getComputedStyle(parent).gap) || 0

    const parentWidth = parent.offsetWidth + gaps
    const parentHeight = parent.offsetHeight + gaps
    const columns = Math.round(parentWidth / (element.offsetWidth + gaps))
    const rows = Math.round(parentHeight / (element.offsetHeight + gaps))

    const gridStepX = parentWidth / columns
    const gridStepY = parentHeight / rows

    return { gridStepX, gridStepY, columns, rows }
  }

  function calculatePositionInGrid(element, { offsetX, offsetY }) {
    const gridInfo = calculateGridStep(element)
    const { gridStepX, gridStepY, columns, rows } = gridInfo

    const elementStartX = element.offsetLeft - (left_offset ? element.parentNode.offsetLeft : 0)
    const elementStartY = element.offsetTop - (top_offset ? element.parentNode.offsetTop : 0)

    const newX = elementStartX + offsetX
    const newY = elementStartY + offsetY

    const newGridX = Math.max(0, Math.min(Math.round(newX / gridStepX), columns - 1))
    const newGridY = Math.max(0, Math.min(Math.round(newY / gridStepY), rows))
    const newPositionIndex = Math.min(
      newGridY * columns + newGridX,
      element.parentNode.children.length - 1
    )

    return { x: newGridX, y: newGridY, index: newPositionIndex }
  }

  function handleDragStart(event) {
    const width = event.target.offsetWidth,
      height = event.target.offsetHeight,
      elementStartX = event.target.offsetLeft,
      elementStartY = event.target.offsetTop

    let { index } = calculatePositionInGrid(event.target, { offsetX: 0, offsetY: 0 })
    if (params.min_index && index < params.min_index) return
    drag_index = index
    const beforeElement = event.target.parentNode.children[index]
    holder.style.setProperty('height', `${height}px`)
    holder.style.setProperty('width', `${width}px`)
    event.target.parentNode.insertBefore(holder, beforeElement)

    event.target.style.setProperty('position', 'absolute')
    event.target.style.setProperty('width', `${width}px`)
    event.target.style.setProperty('height', `${height}px`)
    event.target.style.setProperty('left', `${elementStartX}px`)
    event.target.style.setProperty('top', `${elementStartY}px`)
  }

  function handleDrag(event) {
    if (swap) return
    event.target.parentNode.removeChild(holder)
    let { index } = calculatePositionInGrid(event.target, event.detail)
    if (params.min_index && index < params.min_index) index = params.min_index
    if (index >= drag_index) index++
    const beforeElement = event.target.parentNode.children[index]
    if (!beforeElement) {
      event.target.parentNode.appendChild(holder)
    } else event.target.parentNode.insertBefore(holder, beforeElement)
  }

  function handleDragEnd(event) {
    event.stopPropagation()
    event.preventDefault()
    let { index } = calculatePositionInGrid(event.target, event.detail)
    if (params.min_index && index < params.min_index) index = params.min_index

    if (update_function) {
      if (drag_index !== index)
        update_function(
          drag_index,
          index,
          event.target,
          event.target.parentNode.children[index < drag_index ? index + 1 : index]
        )
      else update_function(drag_index, index, event.target, event.target)
    } else if (store) {
      store.update(($store) => {
        let new_own_cards = $store[key]
        if (swap) {
          if (index >= new_own_cards.length) return $store
          const dragged = new_own_cards[drag_index]
          new_own_cards[drag_index] = new_own_cards[index]
          new_own_cards[index] = dragged
          return { ...$store, [key]: new_own_cards }
        } else {
          const element = new_own_cards.splice(drag_index, 1)[0]
          new_own_cards.splice(index, 0, element)
          return { ...$store, [key]: new_own_cards }
        }
      })
    }

    event.target.parentNode.removeChild(holder)
    event.target.style.setProperty('position', null)
    event.target.style.setProperty('width', null)
    event.target.style.setProperty('height', null)
    event.target.style.setProperty('left', null)
    event.target.style.setProperty('top', null)
    event.target.style.setProperty('transform', null)
    event.target.classList.remove('dragme')
  }

  node.addEventListener('neodrag:start', handleDragStart)
  node.addEventListener('neodrag', handleDrag)
  node.addEventListener('neodrag:end', handleDragEnd)

  return {
    destroy() {
      node.removeEventListener('neodrag:start', handleDragStart)
      node.removeEventListener('neodrag', handleDrag)
      node.removeEventListener('neodrag:end', handleDragEnd)
      destroyDraggable()
    }
  }
}

export function arrange(node, listen) {
  const setChildrenMaxHeight = () => {
    requestAnimationFrame(() => {
      const children = Array.from(node.children)
      children.forEach((child) => (child.style.height = null))
      const maxHeight = children.reduce((max, child) => Math.max(max, child.offsetHeight), 0)
      children.forEach((child) => (child.style.height = `calc(${maxHeight}px + .7vw)`))
    })
  }

  let unsubscribe
  if (listen) unsubscribe = listen.subscribe(setChildrenMaxHeight)
  setChildrenMaxHeight()

  return {
    destroy() {
      if (unsubscribe) unsubscribe()
    }
  }
}
