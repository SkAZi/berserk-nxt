from PIL import Image
import os
import re

def create_tilesets(folder_path):
    # Отфильтровываем список файлов, оставляя только подходящие имена
    files = [f for f in os.listdir(folder_path) if re.match(r'^\d+\.jpg$', f)]
    files.sort(key=lambda x: int(x.split('.')[0]))  # Сортируем по числовому значению имени

    rows, cols = 7, 10
    tile_width, tile_height = 496, 700

    # Вычисляем размер финального изображения
    image_width, image_height = cols * tile_width, rows * tile_height

    for i in range(0, len(files), 69):
        batch = files[i:i+69]

        # Создаем новое изображение с чёрным фоном
        result_image = Image.new('RGB', (image_width, image_height), (0, 0, 0))
        
        for idx, file in enumerate(batch):
            img = Image.open(os.path.join(folder_path, file))
            #img = img.resize((tile_width, tile_height))

            # Вычисляем позицию каждого тайла
            x_offset = (idx % cols) * tile_width
            y_offset = (idx // cols) * tile_height

            result_image.paste(img, (x_offset, y_offset))

        # Сохраняем результат
        folder_name = os.path.basename(folder_path)
        result_image.save(f'{folder_name}-{i//69+1}.jpg', quality=95)

# Путь к папке с картинками
for folder_path in ['out_web/assets/cards/21','out_web/assets/cards/22']:
    create_tilesets(folder_path)
