import { useState } from "react";
import { useForma } from "@/lib/forma/store";

export function ChangeLog() {
  const { changeLog } = useForma();
  const [open, setOpen] = useState(false);
  if (!changeLog.length) return null;

  return (
    <div className="border-t border-border px-3 py-2.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-[12px] text-muted-foreground hover:text-foreground"
      >
        <span className="font-medium uppercase tracking-wide">
          Change log · {changeLog.length}
        </span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {changeLog.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-[12px]">
              <span
                className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                  c.status === "accepted" ? "bg-success" : "bg-destructive"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-foreground">{c.action}</div>
                <div className="text-muted-foreground">
                  {c.initiator} ·{" "}
                  {new Date(c.ts).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
