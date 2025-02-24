import pandas as pd
import json
from bs4 import BeautifulSoup
import requests
import time
import cv2
import concurrent.futures
import numpy as np
import os
import re
import nltk
from nltk.stem.snowball import SnowballStemmer

from nltk.tokenize import word_tokenize

stop_words = set(['x', 'и', 'в', 'во', 'что', 'он', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из', 'ему', 'теперь', 'даже', 'ну', 'вдруг', 'ли', 'если', 'уже', 'или', 'ни', 'быть', 'был', 'него', 'до', 'вас', 'нибудь', 'опять', 'уж', 'вам', 'ведь', 'там', 'потом', 'себя', 'ничего', 'ей', 'они', 'тут', 'где', 'есть', 'надо', 'ней', 'для', 'мы', 'тебя', 'их', 'чем', 'была', 'сам', 'чтоб', 'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'ж', 'тогда', 'кто', 'этот', 'того', 'потому', 'этого', 'какой', 'совсем', 'ним', 'здесь', 'этом', 'один', 'почти', 'мой', 'тем', 'чтобы', 'нее', 'сейчас', 'были', 'куда', 'зачем', 'всех', 'никогда', 'можно', 'наконец', 'два', 'об', 'другой', 'хоть', 'после', 'над', 'больше', 'тот', 'эти', 'нас', 'про', 'них', 'какая', 'много', 'разве', 'эту', 'моя', 'впрочем', 'хорошо', 'свою', 'этой', 'иногда', 'лучше', 'чуть', 'том', 'такой', 'им', 'более', 'конечно', 'всю'])

stemmer = SnowballStemmer("russian")

TAGS = {'zom': '#зом', 'zoal': '#зол', 'ovs': '#овс', 'uchr': '#учр', 'ordinary': '#рядовая', 'instant': '#внезапка', 'zoz': '#зоз', 'health': '', 'zov': '#зов', 'second': '', 'zoo': '#зоо', 'direct': '#направлен', 'zor': '#зор', 'regen': '#реген', 'stamina': '', 'ova': '#ова', 'strike': '', 'armor': '#брон', 'counter': '', 'tap': '', 'ovz': '#овз', 'zot': '#зот', 'first': '', 'elite': '#элитный', 'move': ''}
ICONS = {'zom': 'защита от магии', 'zoal': 'защита от летающих', 'ovs': 'опыт в стрельбе', 'uchr': 'удар через ряд', 'ordinary': 'рядовая', 'instant': 'внезапное действие', 'zoz': 'защита от заклинаний', 'health': 'здоровье', 'zov': 'защита от выстрелов', 'second': 'второй', 'zoo': 'защита от отравления', 'direct': 'направленный удар', 'zor': 'защита от разрядов', 'regen': 'регенерация', 'stamina': 'стойкость', 'ova': 'опыт в атаке', 'strike': 'простой удар', 'armor': 'броня', 'counter': 'фишка', 'tap': 'тап', 'ovz': 'опыт в защите', 'zot': 'защита метания', 'first': 'первый', 'elite': 'элитный золотой', 'move': 'ход'}

TYPE = {
    0: "Существо",
    1: "Существо – Летающее",
    2: "Существо – Компаньон",
    3: "Существо – Паразит",
    4: "Артефакт",
    5: "Местность",
}

PROPS = {
    "sht": "Выстрел",
    "thr": "Метание",
    "dsc": "Разряд",
    "sph": "Особый удар",
    "uht": "Безответный удар",
    "mht": "Магический удар",
    "uchr": "{uchr}",
    "spl": "Заклинание",
    "imp": "Воздействие",
    "inc": "Бестелесный",
    "fry": "Бешенство",
    "bls": "Благословление",
    "vlh": "Вальхалла",
    "vmp": "Вампиризм",
    "fin": "Добивание",
    #"inco": "Инкорнация",
    "cnc": "Концентрация",
    "dep": "На глубине",
    "sur": "На поверхности",
    "clm": "Неповоротливость",
    "psn": "Отравление",
    "cur": "Проклятие",
    "prp": "Пророчество",
    "lep": "Прыжок",
    "das": "Рывок",
    "frm": "Строй",
    "tlp": "Телепортация",
    "nec": "Трупоедство"
}

def process_tokens(row, icons):
    base_text = str(row['text']) if pd.notna(row['text']) else ""
    for icon in ICONS.keys():
        base_text = base_text.replace('{' + icon + '}', ' ' + ICONS[icon] + ' ')
    text = re.sub(r'[^\w\d\s\+-]', '', base_text).replace(' - ', ' ').replace(' ', ' ')
    text = ' '.join([row['name'], TYPE[int(row['type']) - 1], " ".join(str(row['class'] if pd.notna(row['class']) else "").split('.')), text])
    tags = []
    for icon in icons.keys():
        if icon != '' and icon in TAGS:
            tags.append(TAGS[icon])
            text += " " + ICONS[icon]

    tokens = re.split(r'\s+', re.sub(r'[.,\/#!$%\^&\*;:{}=_`~()]«»—', '', text.lower().replace('ё','е') ))
    tokens = [stemmer.stem(word.lower()) for word in tokens if (not word.isdigit() or word.startswith('+') or word.startswith('-')) and word.lower() not in stop_words]
    #print((" ".join(tokens) + " " + " ".join(tags)).strip())
    return " " + (" ".join(tokens) + " " + " ".join(tags)).strip()

def process_icons(row):
    # Собираем все поля icons
    icons_fields = ['ova', 'ovz', 'ovs', 'zoal', 'zoo', 'zov', 'zoz', 'zom', 'zor', 'zot', 'armor', 'direct', 'regen', 'stamina']
    icons = {field: int(row[field]) for field in icons_fields if pd.notna(row[field])}
    for icn, name in PROPS.items():
        if name.lower() in row['text'].lower():
            icons[icn] = 0
    return icons

with open('alts.json', 'r') as f:
    alts_data = json.load(f)

# Загрузка данных из CSV файла
df = pd.read_csv('50.csv', sep=',')

# Преобразование данных
json_lines = []
for index, row in df.iterrows():
    if not pd.notna(row['name']):
        continue
    #print(row['name'])
    icons = process_icons(row)
    fullid = f"{50*1000 + int(row['number'])}"
    card = {
        "id": fullid,
        "set_id": 50,
        "number": int(row['number']),
        "name": row['name'],
        "rarity": int(row['rarity']),
        "cost": int(row['cost']),
        "elite": bool(int(row['elite']) if pd.notna(row['elite']) else 0),
        "uniq": bool(int(row['uniq']) if pd.notna(row['uniq']) else 0),
        "color": int(row['color']),
        "class": [s.strip() for s in str(row['class']).split('.')] if pd.notna(row['class']) else [""],
        "type": int(row['type']) - 1,
        "life": int(row['life']) if pd.notna(row['life']) else None,
        "move": int(row['move']) if pd.notna(row['move']) else None,
        "hit": [int(x) for x in row['hit'].split('-')] if pd.notna(row['hit']) and '-' in row['hit'] else None,
        "horde": bool(int(row['horde']) if pd.notna(row['horde']) else 0),
        "icons": icons,
        "art": row['artist'],
        "tokens": process_tokens(row, icons),
        "text": row['text'] if pd.notna(row['text']) else "",
        "prints": {},
        "alts": [], #["alt"] if fullid in alts_data["alt"] else [],
        "alt": "",
        "altto": None
    }
    print(', ' + json.dumps(card, ensure_ascii=False, separators=(',', ':')))
    #print(f"cp {card["number"]}.jpg 1")
    # if fullid in alts_data["alt"]:
    #     card["id"] = fullid + "alt"
    #     card["alt"] = "alt"
    #     card["altto"] = fullid
    #     print(', ' + json.dumps(card, ensure_ascii=False, separators=(',', ':')))
