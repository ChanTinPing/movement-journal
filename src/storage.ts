import { DayRecord } from "./types";

const STORAGE_KEY = "movement-journal-records";

const seedData: DayRecord[] = [
  {
    id: "seed-2026-03-18",
    date: "2026-03-18",
    updatedAt: "2026-03-18T21:30:00.000Z",
    exercises: [
      {
        id: "seed-bulgarian",
        name: "单腿保加利亚蹲",
        loadGroups: [
          {
            id: "seed-bodyweight",
            label: "",
            entries: ["7", "8", "7", "8"],
          },
        ],
      },
      {
        id: "seed-squat",
        name: "深蹲",
        loadGroups: [
          {
            id: "seed-10kg",
            label: "10kg",
            entries: ["9", "9", "9"],
          },
        ],
      },
    ],
  },
];

export function loadRecords(): DayRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return seedData;
  }

  try {
    const parsed = JSON.parse(raw) as DayRecord[];
    return Array.isArray(parsed) ? parsed : seedData;
  } catch {
    return seedData;
  }
}

export function saveRecords(records: DayRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
