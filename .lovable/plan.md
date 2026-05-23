## Problem

PDF uploads fail silently — files show as "Error" in the upload list. Root cause is in `src/lib/forma/file-extractor.ts`:

```ts
pdfjs.GlobalWorkerOptions.workerSrc = "";
const doc = await pdfjs.getDocument({ data: buf, disableWorker: true }).promise;
```

`pdfjs-dist` v4 requires a real worker. Both `workerSrc = ""` and `disableWorker: true` are unsupported, so `getDocument` throws and the surrounding `try/catch` returns `""` — which `MultiUploadZone` treats as extraction failure.

## Fix

Update `src/lib/forma/file-extractor.ts`'s PDF branch to load the worker via Vite's `?url` import (works in the browser bundle, no manual hosting needed):

```ts
const pdfjs: any = await import("pdfjs-dist");
const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const buf = await file.arrayBuffer();
const doc = await pdfjs.getDocument({ data: buf }).promise;
```

Also improve error visibility: surface the underlying error message on the uploaded file row (or at minimum keep the `console.error` and confirm the existing "Error" badge renders) so future failures aren't silent.

## Scope

- Edit only `src/lib/forma/file-extractor.ts` (PDF branch).
- No changes to upload UI, store, or other extractors.
- Verify by uploading a PDF and confirming text is extracted and status flips to "Ready".
