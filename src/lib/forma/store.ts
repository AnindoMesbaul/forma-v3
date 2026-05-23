import { create } from "zustand";
import type {
  ChangeLogEntry,
  ChatMessage,
  OrgNode,
  Op,
  Proposal,
  AppPhase,
  EmployeeRecord,
  UploadedFile,
} from "./types";
import { applyOps, computeDerived, opsSignature } from "./org";

interface FormaState {
  fileName: string | null;
  nodes: OrgNode[];
  proposals: Proposal[];
  changeLog: ChangeLogEntry[];
  rejectedSignatures: string[];
  selectedNodeId: string | null;
  focusedProposalId: string | null;
  chat: ChatMessage[];
  aiThinking: boolean;

  loadCsv: (fileName: string, nodes: OrgNode[]) => void;
  selectNode: (id: string | null) => void;
  reparent: (nodeId: string, newManagerId: string | null) => void;
  updateNode: (nodeId: string, patch: Partial<OrgNode>) => void;
  focusProposal: (id: string | null) => void;

  setProposals: (proposals: Proposal[]) => void;
  addProposals: (proposals: Proposal[]) => void;
  acceptProposal: (id: string) => void;
  rejectProposal: (id: string) => void;

  addChat: (m: ChatMessage) => void;
  setThinking: (v: boolean) => void;
  prefillChat: string | null;
  setPrefill: (s: string | null) => void;

  appPhase: AppPhase;
  uploadedFiles: UploadedFile[];
  employeeRecords: EmployeeRecord[];
  builderThinking: boolean;
  setAppPhase: (phase: AppPhase) => void;
  setUploadedFiles: (files: UploadedFile[]) => void;
  setEmployeeRecords: (records: EmployeeRecord[]) => void;
  setBuilderThinking: (v: boolean) => void;
  updateEmployeeRecord: (id: string, patch: Partial<EmployeeRecord>) => void;
  resetAll: () => void;
}

export const useForma = create<FormaState>((set, get) => ({
  fileName: null,
  nodes: [],
  proposals: [],
  changeLog: [],
  rejectedSignatures: [],
  selectedNodeId: null,
  focusedProposalId: null,
  chat: [],
  aiThinking: false,
  prefillChat: null,

  appPhase: "upload",
  uploadedFiles: [],
  employeeRecords: [],
  builderThinking: false,
  setAppPhase: (phase) => set({ appPhase: phase }),
  setUploadedFiles: (files) => set({ uploadedFiles: files }),
  setEmployeeRecords: (records) => set({ employeeRecords: records }),
  setBuilderThinking: (v) => set({ builderThinking: v }),
  updateEmployeeRecord: (id, patch) =>
    set({
      employeeRecords: get().employeeRecords.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    }),
  resetAll: () =>
    set({
      appPhase: "upload",
      uploadedFiles: [],
      employeeRecords: [],
      nodes: [],
      proposals: [],
      changeLog: [],
      rejectedSignatures: [],
      selectedNodeId: null,
      focusedProposalId: null,
      chat: [],
      fileName: null,
    }),

  focusProposal: (id) => set({ focusedProposalId: id }),

  loadCsv: (fileName, nodes) =>
    set({
      fileName,
      nodes: computeDerived(nodes),
      proposals: [],
      changeLog: [],
      rejectedSignatures: [],
      selectedNodeId: null,
      chat: [],
      appPhase: "canvas",
    }),

  selectNode: (id) => set({ selectedNodeId: id }),

  reparent: (nodeId, newManagerId) => {
    const nodes = applyOps(get().nodes, [
      { type: "reparent", nodeId, newManagerId },
    ]);
    set({
      nodes,
      changeLog: [
        {
          id: crypto.randomUUID(),
          ts: Date.now(),
          action: `Reparented ${nodes.find((n) => n.id === nodeId)?.name ?? nodeId}`,
          initiator: "user",
          status: "accepted",
        },
        ...get().changeLog,
      ],
    });
  },

  updateNode: (nodeId, patch) => {
    const nodes = applyOps(get().nodes, [{ type: "update", nodeId, patch }]);
    set({ nodes });
  },

  setProposals: (proposals) => set({ proposals }),
  addProposals: (proposals) =>
    set({ proposals: [...get().proposals, ...proposals] }),

  acceptProposal: (id) => {
    const p = get().proposals.find((x) => x.id === id);
    if (!p) return;
    const nodes = applyOps(get().nodes, p.ops);
    set({
      focusedProposalId: get().focusedProposalId === id ? null : get().focusedProposalId,
      nodes,
      proposals: get().proposals.filter((x) => x.id !== id),
      changeLog: [
        {
          id: crypto.randomUUID(),
          ts: Date.now(),
          action: p.summary,
          initiator: p.source,
          status: "accepted",
        },
        ...get().changeLog,
      ],
    });
  },

  rejectProposal: (id) => {
    const p = get().proposals.find((x) => x.id === id);
    if (!p) return;
    set({
      focusedProposalId: get().focusedProposalId === id ? null : get().focusedProposalId,
      proposals: get().proposals.filter((x) => x.id !== id),
      rejectedSignatures: [...get().rejectedSignatures, opsSignature(p.ops)],
      changeLog: [
        {
          id: crypto.randomUUID(),
          ts: Date.now(),
          action: p.summary,
          initiator: p.source,
          status: "rejected",
        },
        ...get().changeLog,
      ],
    });
  },

  addChat: (m) => set({ chat: [...get().chat, m] }),
  setThinking: (v) => set({ aiThinking: v }),
  setPrefill: (s) => set({ prefillChat: s }),
}));
