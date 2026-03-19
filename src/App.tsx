import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { loadRecords, saveRecords } from "./storage";
import { DayRecord, Exercise } from "./types";
import { createId, formatDateLabel, sortDatesDesc } from "./utils";

type Screen =
  | { name: "home" }
  | { name: "editor"; recordId: string };

type DraftMap = Record<string, string>;

const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
}).format(new Date());

function App() {
  const [records, setRecords] = useState<DayRecord[]>(() => loadRecords());
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [entryDrafts, setEntryDrafts] = useState<DraftMap>({});
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, string>>(
    {},
  );
  const [loadDrafts, setLoadDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    saveRecords(records);
  }, [records]);

  const sortedRecords = useMemo(
    () => [...records].sort((left, right) => sortDatesDesc(left.date, right.date)),
    [records],
  );

  const exerciseSuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          records.flatMap((record) =>
            record.exercises.map((exercise) => exercise.name.trim()).filter(Boolean),
          ),
        ),
      ).sort((left, right) => left.localeCompare(right, "zh-CN")),
    [records],
  );

  const loadSuggestionsByExercise = useMemo(() => {
    const suggestionMap: Record<string, string[]> = {};

    for (const record of records) {
      for (const exercise of record.exercises) {
        const key = exercise.name.trim();
        if (!key) {
          continue;
        }

        const labels = suggestionMap[key] ?? [];
        for (const group of exercise.loadGroups) {
          const label = group.label.trim();
          if (label && !labels.includes(label)) {
            labels.push(label);
          }
        }
        suggestionMap[key] = labels.sort((left, right) =>
          left.localeCompare(right, "zh-CN"),
        );
      }
    }

    return suggestionMap;
  }, [records]);

  const activeRecord =
    screen.name === "editor"
      ? records.find((record) => record.id === screen.recordId) ?? null
      : null;

  function touchRecord(record: DayRecord): DayRecord {
    return {
      ...record,
      updatedAt: new Date().toISOString(),
    };
  }

  function openNewRecord() {
    const existing = records.find((record) => record.date === today);
    if (existing) {
      setScreen({ name: "editor", recordId: existing.id });
      return;
    }

    const nextRecord: DayRecord = {
      id: createId("day"),
      date: today,
      exercises: [],
      updatedAt: new Date().toISOString(),
    };

    setRecords((current) => [nextRecord, ...current]);
    setScreen({ name: "editor", recordId: nextRecord.id });
  }

  function openRecord(recordId: string) {
    setScreen({ name: "editor", recordId });
  }

  function updateRecord(recordId: string, updater: (record: DayRecord) => DayRecord) {
    setRecords((current) =>
      current.map((record) =>
        record.id === recordId ? touchRecord(updater(record)) : record,
      ),
    );
  }

  function removeRecord(recordId: string) {
    setRecords((current) => current.filter((record) => record.id !== recordId));
    setScreen({ name: "home" });
  }

  function changeRecordDate(recordId: string, nextDate: string) {
    setRecords((current) => {
      const source = current.find((record) => record.id === recordId);
      const target = current.find(
        (record) => record.id !== recordId && record.date === nextDate,
      );

      if (!source) {
        return current;
      }

      if (!target) {
        return current.map((record) =>
          record.id === recordId
            ? touchRecord({
                ...record,
                date: nextDate,
              })
            : record,
        );
      }

      const mergedTarget = touchRecord({
        ...target,
        exercises: [...target.exercises, ...source.exercises],
      });

      setScreen({ name: "editor", recordId: target.id });

      return current
        .filter((record) => record.id !== recordId && record.id !== target.id)
        .concat(mergedTarget);
    });
  }

  function addExercise(recordId: string) {
    const fieldId = `exercise-${recordId}`;
    const name = exerciseDrafts[fieldId]?.trim();
    if (!name) {
      return;
    }

    const nextExercise: Exercise = {
      id: createId("exercise"),
      name,
      loadGroups: [
        {
          id: createId("load"),
          label: "",
          entries: [],
        },
      ],
    };

    updateRecord(recordId, (record) => ({
      ...record,
      exercises: [...record.exercises, nextExercise],
    }));

    setExerciseDrafts((current) => ({ ...current, [fieldId]: "" }));
  }

  function renameExercise(recordId: string, exerciseId: string, name: string) {
    updateRecord(recordId, (record) => ({
      ...record,
      exercises: record.exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, name } : exercise,
      ),
    }));
  }

  function removeExercise(recordId: string, exerciseId: string) {
    updateRecord(recordId, (record) => ({
      ...record,
      exercises: record.exercises.filter((exercise) => exercise.id !== exerciseId),
    }));
  }

  function addLoadGroup(recordId: string, exerciseId: string) {
    updateRecord(recordId, (record) => ({
      ...record,
      exercises: record.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              loadGroups: [
                ...exercise.loadGroups,
                {
                  id: createId("load"),
                  label: "",
                  entries: [],
                },
              ],
            }
          : exercise,
      ),
    }));
  }

  function renameLoadGroup(
    recordId: string,
    exerciseId: string,
    loadGroupId: string,
    label: string,
  ) {
    updateRecord(recordId, (record) => ({
      ...record,
      exercises: record.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              loadGroups: exercise.loadGroups.map((group) =>
                group.id === loadGroupId ? { ...group, label } : group,
              ),
            }
          : exercise,
      ),
    }));
  }

  function removeLoadGroup(
    recordId: string,
    exerciseId: string,
    loadGroupId: string,
  ) {
    updateRecord(recordId, (record) => ({
      ...record,
      exercises: record.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              loadGroups:
                exercise.loadGroups.length === 1
                  ? [{ ...exercise.loadGroups[0], label: "", entries: [] }]
                  : exercise.loadGroups.filter((group) => group.id !== loadGroupId),
            }
          : exercise,
      ),
    }));
  }

  function addEntry(recordId: string, exerciseId: string, loadGroupId: string) {
    const fieldId = `entry-${loadGroupId}`;
    const value = entryDrafts[fieldId]?.trim();
    if (!value) {
      return;
    }

    updateRecord(recordId, (record) => ({
      ...record,
      exercises: record.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              loadGroups: exercise.loadGroups.map((group) =>
                group.id === loadGroupId
                  ? { ...group, entries: [...group.entries, value] }
                  : group,
              ),
            }
          : exercise,
      ),
    }));

    setEntryDrafts((current) => ({ ...current, [fieldId]: "" }));
  }

  function updateEntry(
    recordId: string,
    exerciseId: string,
    loadGroupId: string,
    entryIndex: number,
    value: string,
  ) {
    updateRecord(recordId, (record) => ({
      ...record,
      exercises: record.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              loadGroups: exercise.loadGroups.map((group) =>
                group.id === loadGroupId
                  ? {
                      ...group,
                      entries: group.entries.map((entry, index) =>
                        index === entryIndex ? value : entry,
                      ),
                    }
                  : group,
              ),
            }
          : exercise,
      ),
    }));
  }

  function removeEntry(
    recordId: string,
    exerciseId: string,
    loadGroupId: string,
    entryIndex: number,
  ) {
    updateRecord(recordId, (record) => ({
      ...record,
      exercises: record.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              loadGroups: exercise.loadGroups.map((group) =>
                group.id === loadGroupId
                  ? {
                      ...group,
                      entries: group.entries.filter((_, index) => index !== entryIndex),
                    }
                  : group,
              ),
            }
          : exercise,
      ),
    }));
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <div>
            <h1>运动日记</h1>
            <p>{screen.name === "home" ? "历史记录" : activeRecord?.date}</p>
          </div>
          {screen.name === "editor" ? (
            <button className="ghost-button" onClick={() => setScreen({ name: "home" })}>
              返回
            </button>
          ) : null}
        </header>

        {screen.name === "home" ? (
          <main className="screen-body">
            <section className="history-list">
              {sortedRecords.length === 0 ? (
                <div className="empty-card">
                  <h2>还没有记录</h2>
                  <p>点右下角的 +，开始写今天的训练。</p>
                </div>
              ) : (
                sortedRecords.map((record) => (
                  <button
                    className="history-card"
                    key={record.id}
                    onClick={() => openRecord(record.id)}
                  >
                    <div className="history-card__head">
                      <div>
                        <strong>{record.date}</strong>
                        <span>{formatDateLabel(record.date)}</span>
                      </div>
                      <span>{record.exercises.length} 个动作</span>
                    </div>

                    {record.exercises.length === 0 ? (
                      <p className="muted">这一天还没有内容</p>
                    ) : (
                      <div className="history-card__items">
                        {record.exercises.slice(0, 4).map((exercise) => (
                          <div className="history-exercise" key={exercise.id}>
                            <div className="history-exercise__name">{exercise.name}</div>
                            <div className="history-exercise__loads">
                              {exercise.loadGroups.map((group) => (
                                <p key={group.id}>
                                  {group.label ? (
                                    <span className="load-label">{group.label}</span>
                                  ) : null}
                                  {group.entries.length > 0
                                    ? group.entries.join(" / ")
                                    : "还没写记录"}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </section>

            <button className="fab" onClick={openNewRecord} aria-label="新增记录">
              +
            </button>
          </main>
        ) : activeRecord ? (
          <main className="screen-body">
            <section className="editor-top">
              <label className="field">
                <span>日期</span>
                <input
                  type="date"
                  value={activeRecord.date}
                  onChange={(event) =>
                    changeRecordDate(activeRecord.id, event.target.value)
                  }
                />
              </label>
              <button
                className="danger-button"
                onClick={() => removeRecord(activeRecord.id)}
              >
                删除这一天
              </button>
            </section>

            <section className="stack">
              {activeRecord.exercises.map((exercise) => (
                <ExerciseEditor
                  key={exercise.id}
                  exercise={exercise}
                  recordId={activeRecord.id}
                  loadSuggestions={loadSuggestionsByExercise[exercise.name.trim()] ?? []}
                  loadDrafts={loadDrafts}
                  entryDrafts={entryDrafts}
                  onExerciseRename={renameExercise}
                  onExerciseRemove={removeExercise}
                  onLoadDraftChange={setLoadDrafts}
                  onEntryDraftChange={setEntryDrafts}
                  onLoadGroupAdd={addLoadGroup}
                  onLoadGroupRename={renameLoadGroup}
                  onLoadGroupRemove={removeLoadGroup}
                  onEntryAdd={addEntry}
                  onEntryChange={updateEntry}
                  onEntryRemove={removeEntry}
                />
              ))}
            </section>

            <section className="add-card">
              <div className="field">
                <span>新增动作</span>
                <div className="inline-row">
                  <input
                    type="text"
                    placeholder="例如：深蹲"
                    list="exercise-suggestions"
                    value={exerciseDrafts[`exercise-${activeRecord.id}`] ?? ""}
                    onChange={(event) =>
                      setExerciseDrafts((current) => ({
                        ...current,
                        [`exercise-${activeRecord.id}`]: event.target.value,
                      }))
                    }
                  />
                  <button onClick={() => addExercise(activeRecord.id)}>添加</button>
                </div>
              </div>
            </section>
            <datalist id="exercise-suggestions">
              {exerciseSuggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </main>
        ) : null}
      </div>
    </div>
  );
}

type ExerciseEditorProps = {
  exercise: Exercise;
  recordId: string;
  loadSuggestions: string[];
  loadDrafts: Record<string, string>;
  entryDrafts: Record<string, string>;
  onExerciseRename: (recordId: string, exerciseId: string, name: string) => void;
  onExerciseRemove: (recordId: string, exerciseId: string) => void;
  onLoadDraftChange: Dispatch<SetStateAction<Record<string, string>>>;
  onEntryDraftChange: Dispatch<SetStateAction<Record<string, string>>>;
  onLoadGroupAdd: (recordId: string, exerciseId: string) => void;
  onLoadGroupRename: (
    recordId: string,
    exerciseId: string,
    loadGroupId: string,
    label: string,
  ) => void;
  onLoadGroupRemove: (
    recordId: string,
    exerciseId: string,
    loadGroupId: string,
  ) => void;
  onEntryAdd: (recordId: string, exerciseId: string, loadGroupId: string) => void;
  onEntryChange: (
    recordId: string,
    exerciseId: string,
    loadGroupId: string,
    entryIndex: number,
    value: string,
  ) => void;
  onEntryRemove: (
    recordId: string,
    exerciseId: string,
    loadGroupId: string,
    entryIndex: number,
  ) => void;
};

function ExerciseEditor({
  exercise,
  recordId,
  loadSuggestions,
  loadDrafts,
  entryDrafts,
  onExerciseRename,
  onExerciseRemove,
  onLoadDraftChange,
  onEntryDraftChange,
  onLoadGroupAdd,
  onLoadGroupRename,
  onLoadGroupRemove,
  onEntryAdd,
  onEntryChange,
  onEntryRemove,
}: ExerciseEditorProps) {
  return (
    <article className="exercise-card">
      <div className="exercise-card__header">
        <input
          className="exercise-name"
          value={exercise.name}
          onChange={(event) =>
            onExerciseRename(recordId, exercise.id, event.target.value)
          }
        />
        <button
          className="ghost-button danger-text"
          onClick={() => onExerciseRemove(recordId, exercise.id)}
        >
          删除动作
        </button>
      </div>

      <div className="stack">
        {exercise.loadGroups.map((group) => {
          const loadDraftKey = `load-${group.id}`;
          const entryDraftKey = `entry-${group.id}`;
          const hasMultipleGroups = exercise.loadGroups.length > 1;
          const loadValue = loadDrafts[loadDraftKey] ?? group.label;

          return (
            <section className="load-card" key={group.id}>
              <div className="inline-row">
                <input
                  type="text"
                  placeholder={hasMultipleGroups ? "负荷，例如 10kg" : "负荷可留空"}
                  list={`load-suggestions-${exercise.id}`}
                  value={loadValue}
                  onChange={(event) =>
                    onLoadDraftChange((current) => ({
                      ...current,
                      [loadDraftKey]: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    onLoadGroupRename(recordId, exercise.id, group.id, loadValue.trim())
                  }
                />
                <button
                  className="ghost-button"
                  onClick={() => onLoadGroupRemove(recordId, exercise.id, group.id)}
                >
                  删除负荷
                </button>
              </div>

              <div className="entry-list">
                {group.entries.length === 0 ? (
                  <span className="muted">还没写记录</span>
                ) : (
                  group.entries.map((entry, index) => (
                    <div className="entry-chip" key={`${group.id}-${index}`}>
                      <input
                        value={entry}
                        onChange={(event) =>
                          onEntryChange(
                            recordId,
                            exercise.id,
                            group.id,
                            index,
                            event.target.value,
                          )
                        }
                      />
                      <button
                        className="chip-remove"
                        onClick={() =>
                          onEntryRemove(recordId, exercise.id, group.id, index)
                        }
                        aria-label="删除记录"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="inline-row">
                <input
                  type="text"
                  placeholder="例如：9、60s、12"
                  value={entryDrafts[entryDraftKey] ?? ""}
                  onChange={(event) =>
                    onEntryDraftChange((current) => ({
                      ...current,
                      [entryDraftKey]: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onEntryAdd(recordId, exercise.id, group.id);
                    }
                  }}
                />
                <button onClick={() => onEntryAdd(recordId, exercise.id, group.id)}>
                  追加
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <datalist id={`load-suggestions-${exercise.id}`}>
        {loadSuggestions.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>

      <button
        className="ghost-button add-load-button"
        onClick={() => onLoadGroupAdd(recordId, exercise.id)}
      >
        + 新增负荷
      </button>
    </article>
  );
}

export default App;
