export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      return await file.text();
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheets = wb.SheetNames.map((sn) => {
        const ws = wb.Sheets[sn];
        return `--- Sheet: ${sn} ---\n${XLSX.utils.sheet_to_csv(ws)}`;
      });
      return sheets.join("\n\n");
    }
    if (name.endsWith(".pdf")) {
      const pdfjs: any = await import("pdfjs-dist");
      // Configure pdfjs worker via Vite ?url import.
      try {
        const workerUrl = (
          await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
        ).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      } catch (err) {
        console.error("Failed to load pdfjs worker", err);
      }
      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const out: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        out.push(tc.items.map((it: any) => it.str).join(" "));
      }
      return out.join("\n\n");
    }
    if (name.endsWith(".docx")) {
      const mammoth: any = await import("mammoth");
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      return result.value ?? "";
    }
    return await file.text();
  } catch (e) {
    console.error("extractTextFromFile failed for", file.name, e);
    return "";
  }
}