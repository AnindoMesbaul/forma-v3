import { useEffect, useState } from "react";
import { useForma } from "@/lib/forma/store";
import { sendChat } from "./ai-runner";
import {
  ChatInput,
  ChatInputTextArea,
  ChatInputSubmit,
} from "@/components/ui/chat-input";

export function ChatBar() {
  const [value, setValue] = useState("");
  const { nodes, aiThinking, prefillChat, setPrefill } = useForma();
  const disabled = nodes.length === 0;

  useEffect(() => {
    if (prefillChat) {
      setValue(prefillChat);
      setPrefill(null);
    }
  }, [prefillChat, setPrefill]);

  const send = () => {
    const v = value.trim();
    if (!v || disabled || aiThinking) return;
    setValue("");
    sendChat(v);
  };

  return (
    <div className="shrink-0 border-t border-border bg-background p-3">
      <ChatInput
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onSubmit={send}
        loading={aiThinking}
        onStop={() => {}}
      >
        <ChatInputTextArea
          placeholder={
            nodes.length === 0
              ? "Upload a CSV to begin..."
              : "Ask the AI to restructure, analyse, or explain anything..."
          }
          disabled={disabled}
        />
        <ChatInputSubmit />
      </ChatInput>
    </div>
  );
}
