from PIL import Image
import os
import re, math

def create_tilesets(folder_path):
    # Отфильтровываем список файлов, оставляя только подходящие имена
    files = [f for f in os.listdir(folder_path) if re.match(r'^\d+\.jpg$', f)]
    files.sort(key=lambda x: int(x.split('.')[0]))  # Сортируем по числовому значению имени

    rows, cols = 7, 10
    tile_width, tile_height = 496, 700

    # Вычисляем размер финального изображения
    image_width, image_height = cols * tile_width, rows * tile_height

    # Определяем общее количество страниц
    total_pages = math.ceil(219 / 69)

    for page_num in range(total_pages):
        # Создаем новое изображение с чёрным фоном
        result_image = Image.new('RGB', (image_width, image_height), (0, 0, 0))

        for idx in range(69):
            pos = page_num * 69 + idx + 1  # Позиция в общем списке (1-based index)
            file_name = f'{pos}.jpg'
            file_path = os.path.join(folder_path, file_name)

            if os.path.exists(file_path):
                img = Image.open(file_path)
                img = img.resize(list(x // 2 for x in img.size))
            else:
                # Создаем пустое изображение, если файла нет
                img = Image.new('RGB', (tile_width, tile_height), (0, 0, 0))

            # Вычисляем позицию каждого тайла
            x_offset = (idx % cols) * tile_width
            y_offset = (idx // cols) * tile_height

            result_image.paste(img, (x_offset, y_offset))

        # Сохраняем результат
        folder_name = os.path.basename(folder_path)
        result_image.save(f'{folder_name}-{page_num+1}_185.jpg', quality=95)

# Путь к папке с картинками
for folder_path in ['../src/renderer/cards/50']:
    create_tilesets(folder_path)
