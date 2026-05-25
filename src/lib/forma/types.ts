export interface OrgNode {
  id: string;
  name: string;
  manager: string | null; // parent id
  title: string;
  department: string;
  grade?: string;
  location?: string;
  salary?: number;
  span?: number;
  depth?: number;
}

export type Op =
  | { type: "reparent"; nodeId: string; newManagerId: string | null }
  | { type: "create"; node: OrgNode }
  | { type: "delete"; nodeId: string }
  | { type: "update"; nodeId: string; patch: Partial<OrgNode> };

export interface Proposal {
  id: string;
  summary: string;
  reasoning: string;
  impact: string;
  ops: Op[];
  affectedNodeIds: string[];
  source: "ai" | "user";
  status: "pending" | "accepted" | "rejected";
}

export interface ChangeLogEntry {
  id: string;
  ts: number;
  action: string;
  initiator: "ai" | "user";
  status: "accepted" | "rejected";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export type AppPhase = "upload" | "processing" | "reviewing" | "canvas";

export interface Scenario {
  id: string;
  name: string;
  nodes: OrgNode[];
  proposals: Proposal[];
  changeLog: ChangeLogEntry[];
  rejectedSignatures: string[];
  chat: ChatMessage[];
}

export interface EmployeeRecord {
  id: string;
  name: string;
  title: string;
  seniority: string;
  compensation?: number;
  manager?: string;
  department?: string;
  notes: string;
  source: string;
  confidence: "high" | "medium" | "low";
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  extractedText: string;
  status: "pending" | "extracting" | "ready" | "error";
}
