export type LoadGroup = {
  id: string;
  label: string;
  entries: string[];
};

export type Exercise = {
  id: string;
  name: string;
  loadGroups: LoadGroup[];
};

export type DayRecord = {
  id: string;
  date: string;
  exercises: Exercise[];
  updatedAt: string;
};
