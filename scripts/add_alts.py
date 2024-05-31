import json
import csv
import os, shutil

with open('./resources/data.json', 'r') as f:
    cards_json = json.load(f)

with open('./scripts/alts.json', 'r') as f:
  addalts = json.load(f)

def process_cards(cards_json):
    processed_cards = []

    for card in cards_json:
        processed_cards.append(card)
        orig_id = card["id"]
        if orig_id in addalts["alt"]:
            if not card.get("alts"): card["alts"] = []
            card["alts"].append("alt")
            
            alt_card = card.copy()
            alt_card["id"] = f"{orig_id}alt"
            alt_card["prints"] = {}
            alt_card["alts"] = []
            alt_card["alt"] = "alt"
            alt_card["altto"] = card["id"]

            processed_cards.append(alt_card)

    return processed_cards


processed_cards = process_cards(cards_json)
i = True
for card in processed_cards:
    print(i and "[" or ",", json.dumps(card, ensure_ascii=False))
    i = False
print("]")
#print(json.dumps(processed_cards, ensure_ascii=False, indent=2))
