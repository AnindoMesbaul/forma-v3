import { useEffect, useRef, useState } from "react";
import { useForma } from "@/lib/forma/store";

export function ScenarioTabBar() {
  const {
    appPhase,
    scenarios,
    activeScenarioId,
    switchScenario,
    createScenario,
    renameScenario,
    deleteScenario,
    comparisonMode,
    setComparisonMode,
  } = useForma();

  if (appPhase !== "canvas" || scenarios.length === 0) return null;

  const base = scenarios[0];

  return (
    <div className="flex h-10 shrink-0 items-center border-b border-chalk bg-canvas px-4">
      {scenarios.map((s, i) => (
        <ScenarioTab
          key={s.id}
          id={s.id}
          name={s.name}
          isActive={s.id === activeScenarioId}
          isBase={i === 0}
          delta={i === 0 ? 0 : s.positions.length - base.positions.length}
          onSelect={() => switchScenario(s.id)}
          onRename={(name) => renameScenario(s.id, name)}
          onDelete={() => deleteScenario(s.id)}
        />
      ))}
      <button
        type="button"
        onClick={() => createScenario()}
        className="ml-2 px-2 text-[13px] text-muted-foreground transition-colors hover:text-ink"
      >
        + New scenario
      </button>
      {scenarios.length >= 2 && (
        <button
          type="button"
          onClick={() => setComparisonMode(!comparisonMode)}
          className={`ml-auto mr-1 flex items-center gap-1.5 rounded-[6px] border px-3 py-1 text-[13px] font-medium transition-colors ${
            comparisonMode
              ? "border-primary bg-primary text-white"
              : "border-chalk bg-white text-ink hover:border-primary hover:text-primary"
          }`}
        >
          {comparisonMode ? "← Back to canvas" : "Compare scenarios"}
        </button>
      )}
    </div>
  );
}

function ScenarioTab({
  name,
  isActive,
  isBase,
  delta,
  onSelect,
  onRename,
  onDelete,
}: {
  id: string;
  name: string;
  isActive: boolean;
  isBase: boolean;
  delta: number;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setValue(name);
  }, [name, editing]);

  const commit = () => {
    setEditing(false);
    if (value.trim() && value.trim() !== name) onRename(value);
    else setValue(name);
  };

  return (
    <div
      className={`group relative flex h-10 items-center gap-1.5 border-b-2 px-3 text-[13px] transition-colors ${
        isActive
          ? "border-primary text-ink font-medium"
          : "border-transparent text-muted-foreground hover:text-ink"
      }`}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setValue(name);
              setEditing(false);
            }
          }}
          className="w-24 rounded-sm border border-chalk bg-parchment px-1 py-0.5 text-[13px] outline-none focus:border-primary"
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={() => setEditing(true)}
          className="cursor-pointer bg-transparent"
        >
          {name}
        </button>
      )}

      {!isBase && delta !== 0 && (
        <span
          className={`tabular-nums text-[11px] ${
            delta > 0 ? "text-healthy" : "text-violation"
          }`}
        >
          {delta > 0 ? `+${delta}` : `${delta}`}
        </span>
      )}

      {!isBase && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
          aria-label={`Delete ${name}`}
        >
          ×
        </button>
      )}
    </div>
  );
}