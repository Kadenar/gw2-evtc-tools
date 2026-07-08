export type Encounter = {
  id: number;
  code: string;
  name: string;
  wing: number | null;
  kind?: "boss" | "trash" | "fractal" | "strike" | "golem" | "other";
};

export const RAID_ENCOUNTERS: Encounter[] = [
  // Wing 1
  { id: 15438, code: "vg", name: "Vale Guardian", wing: 1, kind: "boss" },
  { id: 15415, code: "race", name: "Spirit Race", wing: 1, kind: "trash" },
  { id: 15429, code: "gors", name: "Gorseval", wing: 1, kind: "boss" },
  { id: 15375, code: "sab", name: "Sabetha the Saboteur", wing: 1, kind: "boss" },

  // Wing 2
  { id: 16123, code: "sloth", name: "Slothasor", wing: 2, kind: "boss" },
  { id: 16088, code: "trio", name: "Bandit Trio - Berg", wing: 2, kind: "trash" },
  { id: 16137, code: "trio", name: "Bandit Trio - Zane", wing: 2, kind: "trash" },
  { id: 16125, code: "trio", name: "Bandit Trio - Narella", wing: 2, kind: "trash" },
  { id: 16115, code: "matt", name: "Matthias Gabrel", wing: 2, kind: "boss" },

  // Wing 3
  { id: 16235, code: "kc", name: "Keep Construct", wing: 3, kind: "boss" },
  { id: 16253, code: "esc", name: "Escort / McLeod the Silent", wing: 3, kind: "trash" },
  { id: 16247, code: "tc", name: "Twisted Castle", wing: 3, kind: "trash" },
  { id: 16246, code: "xera", name: "Xera", wing: 3, kind: "boss" },

  // Wing 4
  { id: 17194, code: "cairn", name: "Cairn the Indomitable", wing: 4, kind: "boss" },
  { id: 17172, code: "mo", name: "Mursaat Overseer", wing: 4, kind: "boss" },
  { id: 17188, code: "sam", name: "Samarog", wing: 4, kind: "boss" },
  { id: 17154, code: "dei", name: "Deimos", wing: 4, kind: "boss" },

  // Wing 5
  { id: 19767, code: "sh", name: "Soulless Horror", wing: 5, kind: "boss" },
  { id: 19828, code: "rr", name: "Desmina Escort / River of Souls", wing: 5, kind: "trash" },
  { id: 19691, code: "bk", name: "Broken King", wing: 5, kind: "trash" },
  { id: 19536, code: "se", name: "Soul Eater", wing: 5, kind: "trash" },
  { id: 19651, code: "eyes", name: "Eye of Judgement", wing: 5, kind: "trash" },
  { id: 19844, code: "eyes", name: "Eye of Fate", wing: 5, kind: "trash" },
  { id: 19450, code: "dhuum", name: "Dhuum", wing: 5, kind: "boss" },

  // Wing 6
  { id: 43974, code: "ca", name: "Conjured Amalgamate", wing: 6, kind: "boss" },
  { id: 44885, code: "ca", name: "Conjured Amalgamate CM", wing: 6, kind: "boss" },
  { id: 21105, code: "twins", name: "Twin Largos - Nikare", wing: 6, kind: "boss" },
  { id: 21089, code: "twins", name: "Twin Largos - Kenut", wing: 6, kind: "boss" },
  { id: 20934, code: "qadim", name: "Qadim", wing: 6, kind: "boss" },

  // Wing 7
  { id: 22006, code: "adina", name: "Cardinal Adina", wing: 7, kind: "boss" },
  { id: 21964, code: "sabir", name: "Cardinal Sabir", wing: 7, kind: "boss" },
  { id: 22000, code: "qpeer", name: "Qadim the Peerless", wing: 7, kind: "boss" },

  // Wing 8
  { id: 26725, code: "greer", name: "Greer, the Blightbringer", wing: 8, kind: "boss" },
  { id: 26774, code: "deci", name: "Decima, the Stormsinger", wing: 8, kind: "boss" },
  { id: 26867, code: "deci", name: "Decima, the Stormsinger", wing: 8, kind: "boss" },
  { id: 26712, code: "ura", name: "Ura, the Steamshrieker", wing: 8, kind: "boss" },
  { id: 27124, code: "kela", name: "Kela, Seneschal of Waves", wing: 8, kind: "boss" },
];

export const KNOWN_ENCOUNTERS: Encounter[] = [
  ...RAID_ENCOUNTERS,
  { id: 16199, code: "golem", name: "Standard Kitty Golem", wing: null, kind: "golem" },
  { id: 19645, code: "golem", name: "Medium Kitty Golem", wing: null, kind: "golem" },
  { id: 19676, code: "golem", name: "Large Kitty Golem", wing: null, kind: "golem" },
  { id: 16178, code: "golem", name: "Massive Kitty Golem 1M", wing: null, kind: "golem" },
  { id: 16202, code: "golem", name: "Massive Kitty Golem 4M", wing: null, kind: "golem" },
  { id: 16169, code: "golem", name: "Massive Kitty Golem 10M", wing: null, kind: "golem" },
  { id: 16177, code: "golem", name: "Average Kitty Golem", wing: null, kind: "golem" },
  { id: 16198, code: "golem", name: "Vital Kitty Golem", wing: null, kind: "golem" },
  { id: 16174, code: "golem", name: "Condition Kitty Golem", wing: null, kind: "golem" },
  { id: 16176, code: "golem", name: "Power Kitty Golem", wing: null, kind: "golem" },
];

export const ENCOUNTER_BY_ID = new Map(KNOWN_ENCOUNTERS.map((encounter) => [encounter.id, encounter]));
const RAID_ENCOUNTER_ORDER_BY_ID = new Map(RAID_ENCOUNTERS.map((encounter, index) => [encounter.id, index]));
const RAID_ENCOUNTER_ORDER_BY_NAME = new Map(
  RAID_ENCOUNTERS.map((encounter, index) => [normalizeEncounterName(encounter.name), index]),
);

export function getEncounterName(id: number | null | undefined): string {
  if (!id) return "Unknown";
  return ENCOUNTER_BY_ID.get(id)?.name ?? `Unknown (${id})`;
}

export function getEncounterWing(id: number | null | undefined): number | null {
  if (!id) return null;
  return ENCOUNTER_BY_ID.get(id)?.wing ?? null;
}

export function getEncounterSortOrder(id: number | null | undefined, name?: string | null): number {
  if (id != null) {
    const orderById = RAID_ENCOUNTER_ORDER_BY_ID.get(id);
    if (orderById != null) return orderById;
  }

  if (name) {
    const orderByName = RAID_ENCOUNTER_ORDER_BY_NAME.get(normalizeEncounterName(name));
    if (orderByName != null) return orderByName;
  }

  return Number.POSITIVE_INFINITY;
}

function normalizeEncounterName(name: string): string {
  return name.trim().toLowerCase();
}
