export const default_collection_options = {
  searchQuery: '',
  sortOrder: 'num',
  sortAsc: 1,
  cardSize: 180,
  showSelected: false,
  onlyBase: false,
  dimAbsent: true,
  showCount: true,
  showPrice: false,
  onlyWithCost: false,
  featuredOnly: false,
  filterNot: false,
  proMode: false,
  details_rarities: false,
  details_colors: false,
  details_sets: false,
  details_eliteness: false,
  details_costs: false,
  details_creature_types: false,
  details_collection: false,
  details_classes: false,
  details_ldb: false,
  details_moves: false,
  details_alts: false,
  details_lifes: false,
  details_min_hits: false,
  details_mid_hits: false,
  details_max_hits: false,
  details_icons: false,
  sets: [],
  rarities: [],
  colors: [],
  eliteness: [],
  costs: [],
  classes: [],
  moves: [],
  lifes: [],
  min_hits: [],
  mid_hits: [],
  max_hits: [],
  creature_types: [],
  collection_counts: [],
  collection_alts: [],
  icons: [],
  ldb: []
};

export const default_deckbuilding_options = {...default_collection_options,
  onlyBase: true,
  showCount: false,
  dimAbsent: false,
  cardSize: 140,
  deckSize: 130,
  filter_tags: [],
  details_deck_filter: false,
  order: 0,
};

export const default_draft_options = {
  name: "",
  step: 0,
  players: 8,
  type: null,
  key: "",
  current_booster: -1,
  method: 'motd',
  variant: 'draft',
  cardSize: {booster: 180, draftdeck: 130, deck: 160, side: 130},
  boosters_set: ["30","40","40","","",""],
  boosters: [],
  own_cards: [],
  side: [],
  their_cards: [],
  look_at: null,
  draft_id: null,
  last_boosters: null,
  useCardPool: false,
  cardPoolName: "",
  cardPool: []
}

export const default_deal_options = {
  deck_id: null,
  cardSize: 160,
  mulligan: 0,
  deal: [],
  deck: [],
  order: 0,
  field: new Array(15).fill(null),
  filter_tags: [],
  searchQuery: ""
}

export const default_settings = {
  settings_path: null,
  collection_options: default_collection_options,
  deckbuilding_options: default_deckbuilding_options,
  draft_options: default_draft_options,
  deal_options: default_deal_options
}
