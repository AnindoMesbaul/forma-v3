import Papa from "papaparse";
import type { OrgNode } from "./types";

export const SAMPLE_CSV = `name,manager,title,department,grade,salary
Sarah Chen,,Chief Executive Officer,Executive,L9,320000
James Okafor,Sarah Chen,Chief Financial Officer,Finance,L8,280000
Priya Sharma,Sarah Chen,Chief Technology Officer,Engineering,L8,290000
Marcus Webb,Sarah Chen,VP People,People,L7,220000
Lisa Tanaka,James Okafor,Director of Finance,Finance,L6,175000
Daniel Reyes,James Okafor,Director of FP&A,Finance,L6,170000
Emily Brooks,Priya Sharma,Engineering Manager,Engineering,L6,185000
Tom Fischer,Priya Sharma,Engineering Manager,Engineering,L6,182000
Aisha Patel,Priya Sharma,Head of Data,Data,L6,190000
Carlos Mendez,Marcus Webb,HR Business Partner,People,L5,120000
Nina Johansson,Marcus Webb,Talent Acquisition Lead,People,L5,118000
Raj Singh,Emily Brooks,Senior Engineer,Engineering,L5,145000
Yuki Tanaka,Emily Brooks,Senior Engineer,Engineering,L5,143000
Ben Carter,Emily Brooks,Engineer,Engineering,L4,115000
Sofia Russo,Emily Brooks,Engineer,Engineering,L4,112000
Kwame Asante,Tom Fischer,Senior Engineer,Engineering,L5,147000
Hannah Lee,Tom Fischer,Engineer,Engineering,L4,113000
Omar Khalil,Tom Fischer,Engineer,Engineering,L4,110000
Fatima Al-Hassan,Aisha Patel,Data Scientist,Data,L5,140000
Jack Morrison,Aisha Patel,Data Engineer,Data,L5,138000
`;

function slugify(name: string, taken: Set<string>): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  let id = base || "node";
  let i = 2;
  while (taken.has(id)) id = `${base}-${i++}`;
  taken.add(id);
  return id;
}

export function parseOrgCsv(text: string): OrgNode[] {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const rows = result.data.filter((r) => r.name && r.name.trim());

  const taken = new Set<string>();
  const nameToId = new Map<string, string>();
  for (const r of rows) {
    nameToId.set(r.name.trim(), slugify(r.name.trim(), taken));
  }

  const nodes: OrgNode[] = rows.map((r) => {
    const name = r.name.trim();
    const managerName = (r.manager ?? "").trim();
    const salaryRaw = (
      r.salary ??
      r.compensation ??
      r["base salary"] ??
      r.base_salary ??
      r.cost ??
      r.pay ??
      ""
    )
      .toString()
      .replace(/[$,\s]/g, "")
      .trim();
    return {
      id: nameToId.get(name)!,
      name,
      manager: managerName ? nameToId.get(managerName) ?? null : null,
      title: (r.title ?? "").trim(),
      department: (r.department ?? "").trim(),
      grade: (r.grade ?? "").trim() || undefined,
      location: (r.location ?? "").trim() || undefined,
      salary: salaryRaw ? Number(salaryRaw) || undefined : undefined,
    };
  });

  return nodes;
}

export function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "forma-sample-org.csv";
  a.click();
  URL.revokeObjectURL(url);
}
