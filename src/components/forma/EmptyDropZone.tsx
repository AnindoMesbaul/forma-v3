import { useRef, useState } from "react";
import { useForma } from "@/lib/forma/store";
import { parseOrgCsv, downloadSampleCsv } from "@/lib/forma/csv";
import { runAnalysis } from "./ai-runner";

export function EmptyDropZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { loadCsv } = useForma();
  const [drag, setDrag] = useState(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseOrgCsv(text);
    loadCsv(file.name, parsed);
    runAnalysis();
  };

  return (
    <div className="grid h-full place-items-center p-8">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`flex h-[320px] w-[520px] cursor-pointer flex-col items-center justify-center rounded-[6px] border border-dashed bg-surface px-8 text-center transition-colors ${
          drag ? "border-primary bg-surface-2" : "border-border-strong"
        }`}
      >
        <h1 className="text-[15px] font-semibold text-foreground">
          Drop your org CSV here or click to upload
        </h1>
        <p className="mt-2 text-muted-foreground">
          Required columns: name, manager, title, department
        </p>
        <p className="text-muted-foreground">
          Optional: grade, location, salary
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadSampleCsv();
          }}
          className="mt-6 text-primary hover:underline"
        >
          Download sample CSV
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
