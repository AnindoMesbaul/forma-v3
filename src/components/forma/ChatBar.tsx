import { useEffect, useRef, useState } from "react";
import { useForma } from "@/lib/forma/store";
import { sendChat } from "./ai-runner";

export function ChatBar() {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const { nodes, aiThinking, prefillChat, setPrefill } = useForma();
  const disabled = nodes.length === 0 || aiThinking;

  useEffect(() => {
    if (prefillChat) {
      setValue(prefillChat);
      setPrefill(null);
      ref.current?.focus();
    }
  }, [prefillChat, setPrefill]);

  const send = () => {
    const v = value.trim();
    if (!v || disabled) return;
    setValue("");
    sendChat(v);
  };

  return (
    <div className="shrink-0 border-t border-border bg-surface p-2">
      <div className="flex items-end gap-2 rounded-[6px] border border-border bg-background px-2.5 py-1.5 focus-within:border-primary">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={
            nodes.length === 0
              ? "Upload a CSV to begin..."
              : "Ask the AI to restructure, analyse, or explain anything..."
          }
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-[13px] outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={disabled || !value.trim()}
          className="rounded-[4px] bg-primary px-2.5 py-1 text-[12px] font-medium text-primary-foreground disabled:opacity-30"
        >
          Send
        </button>
      </div>
    </div>
  );
}
