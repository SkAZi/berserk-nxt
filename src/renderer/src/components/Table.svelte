<script>
  import { onMount } from 'svelte'
  import { setSecondLevelMenu, loader } from '../stores/interface.js'
  import { writable } from 'svelte/store'

  // Состояние объектов на столе
  let objects = writable([
    {
      id: 1,
      type: 'card',
      baseX: 100,
      x: 100,
      baseY: 100,
      y: 100,
      zIndex: 1,
      rotation: 0,
      faceDown: false,
      selected: false
    },
    {
      id: 2,
      type: 'deck',
      baseX: 200,
      x: 200,
      baseY: 200,
      y: 200,
      zIndex: 2,
      rotation: 0,
      faceDown: false,
      selected: false
    }
  ])

  // Переменные для работы с выделением прямоугольником
  let isSelecting = false
  let isDragging = false
  let cardDragging = false
  let selectionBox = { x: 0, y: 0, width: 0, height: 0 }

  // Управление зумом
  let scale = 1

  // Управление контекстным меню
  let contextMenuVisible = false
  let contextMenuPosition = { x: 0, y: 0 }
  let contextMenuItems = []

  onMount(() => {
    loader.set(false)

    return () => {
      loader.set(true)
      setSecondLevelMenu()
    }
  })

  // Функции для работы с объектами
  function startDrag(id, event) {
    // Обновляем zIndex для перетаскиваемого объекта и всех выделенных объектов
    selectionBox = {
      x: event.clientX,
      y: event.clientY,
      width: 0,
      height: 0
    }
    objects.update((items) => {
      const maxZIndex = Math.max(...items.map((item) => item.zIndex))
      const selected = items.find((item) => item.id === id)?.selected || false
      return items.map((item) => {
        if (item.id === id) {
          item.zIndex = maxZIndex + 1
          item.selected = true
        } else {
          if (!selected) item.selected = false
        }
        return item
      })
    })
    cardDragging = true
  }

  function handleRightClick(event, id) {
    event.preventDefault()
    contextMenuPosition = { x: event.clientX, y: event.clientY }
    contextMenuVisible = true

    const object = getObjectById(id)

    if (object.type === 'card') {
      contextMenuItems = [
        { label: 'Повернуть', action: () => rotateObject(id, 90) },
        { label: 'Перевернуть', action: () => flipObject(id) },
        { label: 'Убрать со стола', action: () => removeObject(id) }
      ]
    } else if (object.type === 'deck') {
      contextMenuItems = [
        { label: 'Перемешать', action: () => shuffleDeck(id) },
        { label: 'Взять карты в руку', action: () => drawFromDeck(id) },
        { label: 'Убрать со стола', action: () => removeObject(id) }
      ]
    } else {
      contextMenuItems = [
        { label: 'Добавить карту', action: addCard },
        { label: 'Добавить колоду', action: addDeck }
      ]
    }
  }

  function rotateObject(id, degrees) {
    objects.update((items) =>
      items.map((item) => {
        if (item.id === id) {
          item.rotation = (item.rotation + degrees) % 360
        }
        return item
      })
    )
  }

  function flipObject(id) {
    objects.update((items) =>
      items.map((item) => {
        if (item.id === id) {
          item.faceDown = !item.faceDown
        }
        return item
      })
    )
  }

  function removeObject(id) {
    objects.update((items) => items.filter((item) => item.id !== id))
  }

  function getObjectById(id) {
    let foundObject
    objects.subscribe((items) => {
      foundObject = items.find((item) => item.id === id)
    })()
    return foundObject
  }

  function addCard() {
    const newCard = {
      id: Date.now(),
      type: 'card',
      x: contextMenuPosition.x,
      y: contextMenuPosition.y,
      zIndex: 1,
      rotation: 0,
      faceDown: false
    }
    objects.update((items) => [...items, newCard])
  }

  function addDeck() {
    const newDeck = {
      id: Date.now(),
      type: 'deck',
      x: contextMenuPosition.x,
      y: contextMenuPosition.y,
      zIndex: 1,
      rotation: 0,
      faceDown: false
    }
    objects.update((items) => [...items, newDeck])
  }

  function zoom(event) {
    if(!event.shiftKey) return;
    event.preventDefault()
    const zoomStep = 0.01
    scale += event.deltaY > 0 ? -zoomStep : zoomStep
    scale = Math.max(0.5, Math.min(scale, 2))
  }

  function startSelection(event) {
    if (event.shiftKey) isDragging = true
    else isSelecting = true
    selectionBox = {
      x: event.clientX,
      y: event.clientY,
      width: 0,
      height: 0
    }
  }

  function updateSelection(event) {
    if (isSelecting) {
      selectionBox.width = event.clientX - selectionBox.x
      selectionBox.height = event.clientY - selectionBox.y

      objects.update((items) =>
        items.map((item) => {
          const isInSelection =
            item.x >= selectionBox.x &&
            item.x <= selectionBox.x + selectionBox.width &&
            item.y >= selectionBox.y &&
            item.y <= selectionBox.y + selectionBox.height
          return { ...item, selected: isInSelection }
        })
      )
    }

    if (isDragging) {
      objects.update((items) =>
        items.map((item) => {
          return {
            ...item,
            x: item.baseX + (event.clientX - selectionBox.x),
            y: item.baseY + (event.clientY - selectionBox.y)
          }
        })
      )
    }

    if (cardDragging) {
      objects.update((items) =>
        items.map((item) => {
          if (!item.selected) return item
          return {
            ...item,
            x: item.baseX + (event.clientX - selectionBox.x),
            y: item.baseY + (event.clientY - selectionBox.y)
          }
        })
      )
    }
  }

  function endSelection(event) {
    isSelecting = false
    if (isDragging) {
      objects.update((items) =>
        items.map((item) => {
          return {
            ...item,
            baseX: item.baseX + (event.clientX - selectionBox.x) * scale,
            baseY: item.baseY + (event.clientY - selectionBox.y) * scale
          }
        })
      )
      isDragging = false
    }
    if (cardDragging) {
      objects.update((items) =>
        items.map((item) => {
          if (!item.selected) return item
          return {
            ...item,
            baseX: item.baseX + (event.clientX - selectionBox.x) * scale,
            baseY: item.baseY + (event.clientY - selectionBox.y) * scale
          }
        })
      )
      cardDragging = false
    }
  }
</script>

<div
  id="table-container"
  on:wheel={zoom}
  on:mousedown={startSelection}
  on:mousemove={updateSelection}
  on:mouseup={endSelection}
  on:contextmenu={handleRightClick}
>
  <div style="transform: scale({scale});">
    {#each $objects as object}
      <div
        class="object"
        bind:this={object.node}
        class:card={object.type === 'card'}
        class:deck={object.type === 'deck'}
        class:selected={object.selected}
        on:mousedown|stopPropagation={(event) => startDrag(object.id, event)}
        on:mouseup|stopPropagation={endSelection}
        on:contextmenu={(event) => handleRightClick(event, object.id)}
        style="position: absolute; left: {object.x}px; top: {object.y}px; z-index: {object.zIndex}; transform: rotate({object.rotation}deg);"
      ></div>
    {/each}
  </div>

  {#if isSelecting}
    <div
      class="selection-box"
      style="left: {selectionBox.x}px; top: {selectionBox.y}px; width: {selectionBox.width}px; height: {selectionBox.height}px;"
    ></div>
  {/if}

  {#if contextMenuVisible}
    <div
      class="context-menu"
      style="left: {contextMenuPosition.x}px; top: {contextMenuPosition.y}px;"
    >
      <ul>
        {#each contextMenuItems as item}
          <li on:click={item.action}>{item.label}</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style>
  #table-container {
    position: absolute;
    overflow: auto;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .object {
    cursor: pointer;
  }

  .selection-box {
    position: absolute;
    border: 1px dashed #000;
    background: rgba(0, 0, 0, 0.1);
  }

  .context-menu {
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    z-index: 1000;
  }

  .context-menu ul {
    list-style-type: none;
    margin: 0;
    padding: 0;
  }

  .context-menu ul li {
    padding: 5px 10px;
    cursor: pointer;
  }

  .context-menu ul li:hover {
    background: #eee;
  }

  .card {
    background: #f5f5f5;
    width: 60px;
    height: 90px;
    border-radius: 5px;
  }

  .deck {
    background: #ddd;
    width: 80px;
    height: 120px;
    border-radius: 5px;
  }

  .selected {
    outline: 2px solid #f00;
  }
</style>
