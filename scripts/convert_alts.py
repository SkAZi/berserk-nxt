import json
import csv
import os, shutil

with open('./resources/data.json', 'r') as f:
    cards_json = json.load(f)

with open('./scripts/alts.json', 'r') as f:
  addalts = json.load(f)

cards_csv = []
with open('./scripts/prints.csv', newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile, delimiter=';')
    for row in reader:
        cards_csv.append(row)

def find_prints(card_id, set_id, number, alts, csv_data):
    prints = {}
    # Обработка основной карты
    csv_row = next((row for row in csv_data if card_id == str(int(row['set'])*1000 + int(row['number']))), None)
    if csv_row:
        for t in ["t1", "t2", "t3", "t4"]:
            if csv_row[t]:
                prints[t] = csv_row[t]
    return prints

def process_cards(cards_json, cards_csv):
    processed_cards = []

    for card in cards_json:
        original_id = card["id"]
        set_id = card["set_id"]
        number = card["number"]
        alts = card.get("alts", [])
        for k, vals in addalts.items():
          if original_id in vals and k not in alts:
            alts.append(k)
            # if k != "f" and not os.path.isfile(f"./resources/cards/{set_id}/{number}{k}.jpg"):
            #   shutil.copy(f"./resources/cards/{set_id}/{number}.jpg", f"./scripts/absent/{number}{k}.jpg")
        alts.sort()
        if not alts:
            if not card.get("altto"):
                card["prints"] = find_prints(original_id, set_id, number, [], cards_csv)
                card["alt"] = ""
                card["altto"] = None
                processed_cards.append(card)
        else:
            card["prints"] = find_prints(original_id, set_id, number, [], cards_csv)
            card["alt"] = ""
            card["altto"] = None
            processed_cards.append(card)
            for alt in alts:
                alt_card = card.copy()
                alt_card_id = f"{original_id}{alt}"
                alt_card["id"] = alt_card_id
                alt_card["prints"] = find_prints(alt_card_id, set_id, number, [alt], cards_csv)
                alt_card["alts"] = []
                alt_card["alt"] = alt
                alt_card["altto"] = original_id
                processed_cards.append(alt_card)
            continue


    return processed_cards


processed_cards = process_cards(cards_json, cards_csv)
i = True
for card in processed_cards:
    print(i and "[" or ",", json.dumps(card, ensure_ascii=False))
    i = False
print("]")
#print(json.dumps(processed_cards, ensure_ascii=False, indent=2))
