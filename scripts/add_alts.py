import json
import csv
import os, shutil

with open('../resources/data.json', 'r') as f:
    cards_json = json.load(f)

with open('alts.json', 'r') as f:
  addalts = json.load(f)

def process_cards(cards_json):
    processed_cards = []

    for card in cards_json:
        processed_cards.append(card)
        orig_id = card["id"]
        if card["alt"]: continue
        if orig_id in addalts["f"]:
            if not card.get("alts"): card["alts"] = []
            card["alts"].append("f")

            alt_card = card.copy()
            alt_card["id"] = f"{orig_id}f"
            alt_card["prints"] = {}
            alt_card["alts"] = []
            alt_card["alt"] = "f"
            alt_card["altto"] = card["id"]

            processed_cards.append(alt_card)

        if orig_id in addalts["altfpf"]:
            if not card.get("alts"): card["alts"] = []
            card["alts"].append("altfpf")

            alt_card = card.copy()
            alt_card["id"] = f"{orig_id}altfpf"
            alt_card["prints"] = {}
            alt_card["alts"] = []
            alt_card["alt"] = "altfpf"
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
