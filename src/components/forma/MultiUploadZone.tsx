import { useEffect, useRef, useState } from "react";
import { File as FileIcon, FileSpreadsheet, FileText, X } from "lucide-react";
import { useForma } from "@/lib/forma/store";
import { extractTextFromFile } from "@/lib/forma/file-extractor";
import { buildOrgFromFiles } from "@/lib/forma/builder.functions";
import type { UploadedFile, EmployeeRecord } from "@/lib/forma/types";

const PROGRESS_MESSAGES = [
  "Reading files…",
  "Finding people…",
  "Reconciling data…",
  "Building table…",
];

function iconFor(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".csv"))
    return FileSpreadsheet;
  if (n.endsWith(".pdf") || n.endsWith(".docx") || n.endsWith(".txt"))
    return FileText;
  return FileIcon;
}

export function MultiUploadZone() {
  const {
    uploadedFiles,
    setUploadedFiles,
    setEmployeeRecords,
    setAppPhase,
    builderThinking,
    setBuilderThinking,
  } = useForma();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [progressIdx, setProgressIdx] = useState(0);

  useEffect(() => {
    if (!builderThinking) return;
    const t = setInterval(
      () => setProgressIdx((i) => (i + 1) % PROGRESS_MESSAGES.length),
      2000,
    );
    return () => clearInterval(t);
  }, [builderThinking]);

  const addFiles = async (files: File[]) => {
    const newOnes: UploadedFile[] = files.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      type: f.type || f.name.split(".").pop() || "",
      extractedText: "",
      status: "extracting",
    }));
    const merged = [...uploadedFiles, ...newOnes];
    setUploadedFiles(merged);

    for (let i = 0; i < newOnes.length; i++) {
      const target = newOnes[i];
      const text = await extractTextFromFile(files[i]);
      const current = useForma.getState().uploadedFiles.map((uf) =>
        uf.id === target.id
          ? {
              ...uf,
              extractedText: text,
              status: text ? ("ready" as const) : ("error" as const),
            }
          : uf,
      );
      setUploadedFiles(current);
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(uploadedFiles.filter((f) => f.id !== id));
  };

  const ready = uploadedFiles.filter((f) => f.status === "ready");
  const canRun = ready.length > 0 && !builderThinking;

  const runBuilder = async () => {
    setBuilderThinking(true);
    setAppPhase("processing");
    try {
      const result = await buildOrgFromFiles({
        data: {
          files: ready.map((f) => ({ name: f.name, content: f.extractedText })),
        },
      });
      const records: EmployeeRecord[] = (result.employees ?? []).map((e: any) => ({
        id: crypto.randomUUID(),
        name: e.name ?? "",
        title: e.title ?? "",
        seniority: e.seniority ?? "",
        compensation: typeof e.compensation === "number" ? e.compensation : undefined,
        manager: e.manager ?? undefined,
        department: e.department ?? undefined,
        notes: e.notes ?? "",
        source: e.source ?? "",
        confidence: (e.confidence as "high" | "medium" | "low") ?? "medium",
      }));
      setEmployeeRecords(records);
      setAppPhase("reviewing");
    } catch (e) {
      console.error(e);
      setAppPhase("upload");
    } finally {
      setBuilderThinking(false);
    }
  };

  return (
    <div className="grid h-full place-items-center p-8">
      <div className="w-full max-w-[640px]">
        <div className="mb-6 text-center">
          <h1 className="font-display text-[32px] font-light leading-tight text-ink">
            Design your enterprise
          </h1>
          <p className="mt-2 text-muted-foreground">
            Drop in your HR files, salary data, org charts etc.
          </p>
        </div>

        <div
          onClick={() => !builderThinking && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!builderThinking) setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (builderThinking) return;
            const files = Array.from(e.dataTransfer.files ?? []);
            if (files.length) addFiles(files);
          }}
          className={`flex h-[200px] cursor-pointer flex-col items-center justify-center rounded-[12px] border border-dashed bg-white px-8 text-center transition-colors ${
            drag ? "border-sage-deep bg-healthy-bg" : "border-chalk"
          } ${builderThinking ? "opacity-60" : ""}`}
        >
          <p className="font-display text-[18px] text-ink">
            Drop files here or click to upload
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Supported: .csv .xlsx .xls .pdf .docx .txt
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) addFiles(files);
            e.target.value = "";
          }}
        />

        {uploadedFiles.length > 0 && (
          <ul className="mt-4 space-y-2">
            {uploadedFiles.map((f) => {
              const Icon = iconFor(f.name);
              return (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-[10px] border border-chalk bg-white px-3 py-2"
                >
                  <Icon className="h-4 w-4 text-slate" />
                  <span className="flex-1 truncate text-[13px] text-ink">
                    {f.name}
                  </span>
                  {f.status === "extracting" && (
                    <span className="animate-pulse text-[12px] text-muted-foreground">
                      Extracting…
                    </span>
                  )}
                  {f.status === "ready" && (
                    <span className="flex items-center gap-1.5 text-[12px] text-sage-deep">
                      <span className="h-2 w-2 rounded-full bg-sage-core" />
                      Ready
                    </span>
                  )}
                  {f.status === "error" && (
                    <span className="flex items-center gap-1.5 text-[12px] text-destructive">
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      Error
                    </span>
                  )}
                  <button
                    onClick={() => removeFile(f.id)}
                    className="text-slate hover:text-ink"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-6">
          {builderThinking ? (
            <div className="flex flex-col items-center gap-2 rounded-[10px] border border-chalk bg-white px-4 py-4 text-center">
              <div className="font-display text-[14px] text-ink">
                Builder Agent is reading your files…
              </div>
              <div className="animate-pulse text-[12px] text-muted-foreground">
                {PROGRESS_MESSAGES[progressIdx]}
              </div>
            </div>
          ) : (
            <button
              disabled={!canRun}
              onClick={runBuilder}
              className="w-full rounded-[10px] bg-amber-accent px-4 py-3 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Build
            </button>
          )}
        </div>
      </div>
    </div>
  );
}