import { driver } from 'driver.js';
export function collections_driver(){
  return driver({
    showProgress: false, animate: true, overlayColor: '#222', allowClose: true, smoothScroll: true,
    nextBtnText: 'Далее', prevBtnText: 'Назад', doneBtnText: 'Завершить',
    steps: [
      {
        element: 'app',
        popover: {
          title: 'Добро пожаловать!',
          description: 'Это новая энциклопедия ККИ Берсерк. Сейчас я коротко расскажу что тут есть и как ей пользоваться.',
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '.driver-search',
        popover: {
          title: 'Поиск',
          description: 'Тут, как и раньше, есть поиск. Можно искать по имени, номеру карты или тексту.<br/><br/>\
            <strong>Ctrl + f</strong> — быстро начать поиск',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '.driver-sort',
        popover: {
          title: 'Сортировка',
          description: 'Результат можно по-разному отсортировать.',
          side: 'right',
          align: 'center'
        }
      },
      {
        element: '.driver-filter',
        popover: {
          title: 'Фильтры',
          description: 'Можно отобразить только то, что есть в&nbsp;этом наборе. \
                Отображать или нет дополнительные типы карт (ну вот все эти наши \
                с тобой коллекционные штуки: фойлы, полноформат).',
          side: 'right',
          align: 'center'
        }
      },
      {
        element: '.driver-other-filter',
        popover: {
          title: 'Ещё фильтры',
          description: 'Полный набор фильтров, почти как и раньше. Но думаю, мы добавим ещё чуть позже.',
          side: 'right',
          align: 'center'
        }
      },
      {
        element: '.driver-display',
        popover: {
          title: 'Отображение',
          description: 'Тут можно подкорректрировать размер карт и способы их отображения в списке. \
            Так же размер карт можно менять с помощью <strong>Shift + Колесо мыши</strong>',
          side: 'right',
          align: 'end'
        }
      },
      {
        element: '.content .card:first-child',
        popover: {
          title: 'Карты',
          description: 'Самое важное, то, зачем мы тут собрались. Нажимая правой кнопкой на карту \
                ты попадёшь в попап с формой редактирования, но это долго и скучно.<br /><br />\
                <strong>Тыкай в карту — это +1,<br /> тыкай с Alt — это -1, так быстрее.</strong><br /><br />\
                Ну или можно навести мышкой и как в TTS нажать число.',
          side: 'bottom',
          align: 'center'
        }
      },
      {
        element: '.content .card:first-child',
        popover: {
          title: 'Избранное',
          description: '<strong>Клик колесом или ctrl + правая кнопка</strong> — добавить карту в избранное',
          side: 'bottom',
          align: 'center'
        }
      },
      {
        element: '.driver-menu',
        popover: {
          title: 'Импорт и экспорт',
          description: 'Собрав какую-то коллекцию, ты можешь сохранить её в отдельный файл, \
            который потом можно добавить или убрать из любой другой загруженной коллекции. \
            Так ты можешь готовить наборы для обмена или продажи.<br /><br /> \
            Собранную коллекцию можно экспортировать в форматы дружеских проектов.',
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '.driver-stats',
        popover: {
          title: 'Статистики',
          description: 'А тут можно посмотреть сводные статистики.',
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: 'app',
        popover: {
          title: 'Удачи!',
          description: 'Надеюсь, тебе понравится и будет удобно. Пиши, если что не так...',
          side: 'top',
          align: 'center'
        }
      },
    ]
  })
}

export function deckbuilder_driver(){
  let drv = driver({
    showProgress: false, animate: true, overlayColor: '#222', allowClose: true, smoothScroll: true,
    nextBtnText: 'Далее', prevBtnText: 'Назад', doneBtnText: 'Завершить',
    steps: [
      {
        element: '.diver-deck-name',
        popover: {
          title: 'Редактирование колоды',
          description: 'Назови как считаешь нужным.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '.content',
        popover: {
          title: 'Добавление карт',
          description: 'Добавлять и удалять карты можно так же: <br /><br />\
            <strong>Клик — это +1,<br /> Alt + Клик — это -1.</strong>.<br /><br />Правая кнопка — посмотреть карту подробно.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '.decklist',
        popover: {
          title: 'Удаление карт',
          description: 'С этой стороны аналогично, только наоборот: <br /><br />\
            <strong>Клик — это -1,<br /> Alt + Клик — это +1.</strong>.<br /><br />Правая кнопка, всё так же, посмотреть карту подробно.',
          side: 'left',
          align: 'start'
        }
      },
      {
        element: '.driver-deck-order',
        popover: {
          title: 'Сортировка списка',
          description: 'Тут можно поменять сортировку и группировку карт в списке, чтобы было проще что-то посчитать.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '.driver-actions',
        popover: {
          title: 'Экспорт колоды',
          description: 'Здесь можно сохранить, экспортировать или удалить колоду, \
            а так же посмотреть со стороны и немного статистики.',
          side: 'right',
          align: 'end'
        }
      },
      {
        element: '.deck_stats',
        popover: {
          title: 'Статистика',
          description: '...и тут немного статистики. Пока так.',
          side: 'left',
          align: 'end'
        }
      },
      {
        element: '.driver-deckbuilder-deal',
        popover: {
          title: 'Раздача',
          description: ' Тут можно сразу попробовать сдать колоду, расставить её на поле и посчитать по кристаллам.',
          side: 'right',
          align: 'end'
        }
      },
      {
        element: '.driver-deckbuilder-detail',
        popover: {
          title: 'Подробно',
          description: 'А тут рассмотреть колоду чуть подробнее.',
          side: 'right',
          align: 'end'
        }
      },
      {
        element: 'app',
        popover: {
          title: 'Внимание!',
          description: 'Спасибо за внимание...',
          side: 'right',
          align: 'end'
        }
      },
      ]
  })
  return drv
}

export function decks_driver() {
  return driver({
    showProgress: false, animate: true, overlayColor: '#222', allowClose: true, smoothScroll: true,
    nextBtnText: 'Далее', prevBtnText: 'Назад', doneBtnText: 'Завершить',
    steps: [
      {
          element: '.driver-deck-build',
          popover: {
            title: 'Редактор колод!',
            description: 'Второй раздел энциклопедии, где ты можешь составлять и хранить все свои колоды.',
            side: 'top',
            align: 'start'
          }
        },
      {
        element: '.diver-deck-edit',
        popover: {
          title: 'Добавление и импорт',
          description: 'Можешь добавить новую колоду самостоятельно. \
            <br /> Или импортровать через drag-n-grop.',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '.driver-filter',
        popover: {
          title: 'Поиск и фильтры',
          description: 'Колоды можно фильровать и искать по имени, список тегов можно редактировать',
          side: 'right',
          align: 'start',
        }
      },
      {
        element: '.driver-decks',
        popover: {
          title: 'Теги и быстрые действия',
          description: 'С помощью Del/Backspace, наведя на карту можно быстро удалить колоду, \
            Ctrl+число — назначить или снять один из 9 первых тегов',
          side: 'left',
          align: 'start',
        }
      },
      ]
    })

}


export function draft_driver(){
  return driver({
    showProgress: false, animate: true, overlayColor: '#222', allowClose: true, smoothScroll: true,
    nextBtnText: 'Далее', prevBtnText: 'Назад', doneBtnText: 'Завершить',
    steps: [
      {
        element: '.driver-deck-limited',
        popover: {
          title: 'Лимитед!',
          description: 'Драфт пока только с ботами, но зато честно, по кругу. \
            От числа игроков зависит то, какие карты к тебе вернутся.',
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '.driver-tournir-type',
        popover: {
          title: 'Можно и силед',
          description: 'Выбери тип турнира: драфт или силед. Небольшой лайфхак — заполняй первые 3 бустера для драфта, \
             и ещё последние 2 бустера для силеда, а 4-й бустер пропусти, будет удобно переключаться, так можно.',
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '.driver-train-mode',
        popover: {
          title: 'Тренировка',
          description: 'В режиме тренировки боты будут подсказывать что лучше взять по статистике или по модели Карапета.',
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '.driver-tournir-model',
        popover: {
          title: 'Логика бота',
          description: 'А тут можно настроить по какой модели будут вести себя боты. \
            Настроить собственную не сложно, просто укажи для каждого сета порядок пиков. \
            Например ..."30": [195,98,33,66,...] (30 — кодовое имя 3-го сета), те карты, \
            которые раньше в списке, боты возьмут в первую очередь.',
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: 'app',
        popover: {
          title: 'Начать и закончить',
          description: 'В любой момент ты можешь прервать драфт, начав заново, или вернуться к ранее прерванному.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: 'app',
        popover: {
          title: 'Колоды',
          description: 'Всё набранное по-умолчанию уйдёт в сайд, чтобы было удобно выбрать нужное. \
            Собрав колоду, сможешь выгрузить себе в декбилдер и раздать на пробу, ну, там сам всё увидишь. \
            Не забывай, что <em>Shift + колесо</em> где бы то ни было меняет размер сетки карт, настрой всё как тебе удобно.',
          side: 'right',
          align: 'start'
        }
      },
      ]
  })
}

export function deal_driver(){
  return driver({
    showProgress: false, animate: true, overlayColor: '#222', allowClose: true, smoothScroll: true,
    nextBtnText: 'Далее', prevBtnText: 'Назад', doneBtnText: 'Завершить',
    steps: [
      {
        element: '.driver-deck-deal',
        popover: {
          title: 'Воу, подбор отряда!',
          description: 'Деки готовы? К бою! Ну почти... Тут можно раздаться и прикинуть отряд, \
            автоматически посчитав легальность и кристаллы.',
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '.driver-decks',
        popover: {
          title: 'Колоды',
          description: 'Тут будут все твои колоды, их так же можно сортировать, как и в подборе<br /><br /> \
          Клолоды можно помечать тегами и фильтровать по ним, жми плавую кнопку.<br /> \
          Если уже есть на что — <strong>жми и продожим</strong>, если нет — собери деку и возвращайся.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '.driver-field',
        popover: {
          title: 'Поле',
          description: 'Расставься тут как считаешь нужным. Снизу снова немного статистики и кристаллы на I и II ход. \
            Менять размер сетки нельзя, но она будет очень стараться влезть тебе в экран целиком.<br /><br /> \
            Не забудь случайно, по привычке, ткнуть в кнопки t и f, наведя курсор на карту ;)',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: 'aside.right',
        popover: {
          title: 'Управление',
          description: 'Тут, как и в декбилдере колода и управление. \
            Переключаться между редактированием и расстановкой можно в 1 клик.',
          side: 'left',
          align: 'start'
        }
      },
      {
        element: 'app',
        popover: {
          title: 'До новых встреч...',
          description: '...ребята!',
          side: 'right',
          align: 'start'
        }
      },
      ]
  })
}
