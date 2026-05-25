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
  Scenario,
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

  scenarios: Scenario[];
  activeScenarioId: string;
  createScenario: (name?: string) => void;
  switchScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  deleteScenario: (id: string) => void;
}

function mirror(scenarios: Scenario[], activeId: string) {
  const s = scenarios.find((x) => x.id === activeId);
  return {
    nodes: s?.nodes ?? [],
    proposals: s?.proposals ?? [],
    changeLog: s?.changeLog ?? [],
    rejectedSignatures: s?.rejectedSignatures ?? [],
    chat: s?.chat ?? [],
  };
}

function updateActive(
  state: { scenarios: Scenario[]; activeScenarioId: string },
  patch: (s: Scenario) => Partial<Scenario>,
) {
  const scenarios = state.scenarios.map((s) =>
    s.id === state.activeScenarioId ? { ...s, ...patch(s) } : s,
  );
  return { scenarios, ...mirror(scenarios, state.activeScenarioId) };
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

  scenarios: [],
  activeScenarioId: "",

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
      scenarios: [],
      activeScenarioId: "",
    }),

  focusProposal: (id) => set({ focusedProposalId: id }),

  loadCsv: (fileName, nodes) => {
    const base: Scenario = {
      id: crypto.randomUUID(),
      name: "Base",
      nodes: computeDerived(nodes),
      proposals: [],
      changeLog: [],
      rejectedSignatures: [],
      chat: [],
    };
    set({
      fileName,
      scenarios: [base],
      activeScenarioId: base.id,
      selectedNodeId: null,
      appPhase: "canvas",
      ...mirror([base], base.id),
    });
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  reparent: (nodeId, newManagerId) => {
    set((state) =>
      updateActive(state, (s) => {
        const nodes = applyOps(s.nodes, [
          { type: "reparent", nodeId, newManagerId },
        ]);
        return {
          nodes,
          changeLog: [
            {
              id: crypto.randomUUID(),
              ts: Date.now(),
              action: `Reparented ${nodes.find((n) => n.id === nodeId)?.name ?? nodeId}`,
              initiator: "user",
              status: "accepted",
            },
            ...s.changeLog,
          ],
        };
      }),
    );
  },

  updateNode: (nodeId, patch) => {
    set((state) =>
      updateActive(state, (s) => ({
        nodes: applyOps(s.nodes, [{ type: "update", nodeId, patch }]),
      })),
    );
  },

  setProposals: (proposals) =>
    set((state) => updateActive(state, () => ({ proposals }))),
  addProposals: (proposals) =>
    set((state) =>
      updateActive(state, (s) => ({ proposals: [...s.proposals, ...proposals] })),
    ),

  acceptProposal: (id) => {
    const p = get().proposals.find((x) => x.id === id);
    if (!p) return;
    set((state) => ({
      focusedProposalId:
        state.focusedProposalId === id ? null : state.focusedProposalId,
      ...updateActive(state, (s) => ({
        nodes: applyOps(s.nodes, p.ops),
        proposals: s.proposals.filter((x) => x.id !== id),
        changeLog: [
          {
            id: crypto.randomUUID(),
            ts: Date.now(),
            action: p.summary,
            initiator: p.source,
            status: "accepted",
          },
          ...s.changeLog,
        ],
      })),
    }));
  },

  rejectProposal: (id) => {
    const p = get().proposals.find((x) => x.id === id);
    if (!p) return;
    set((state) => ({
      focusedProposalId:
        state.focusedProposalId === id ? null : state.focusedProposalId,
      ...updateActive(state, (s) => ({
        proposals: s.proposals.filter((x) => x.id !== id),
        rejectedSignatures: [...s.rejectedSignatures, opsSignature(p.ops)],
        changeLog: [
          {
            id: crypto.randomUUID(),
            ts: Date.now(),
            action: p.summary,
            initiator: p.source,
            status: "rejected",
          },
          ...s.changeLog,
        ],
      })),
    }));
  },

  addChat: (m) =>
    set((state) => updateActive(state, (s) => ({ chat: [...s.chat, m] }))),
  setThinking: (v) => set({ aiThinking: v }),
  setPrefill: (s) => set({ prefillChat: s }),

  createScenario: (name) => {
    const state = get();
    const active = state.scenarios.find((s) => s.id === state.activeScenarioId);
    if (!active) return;
    const count = state.scenarios.length;
    const autoName =
      name ?? `Option ${String.fromCharCode(64 + count)}`; // count=1 -> "A"
    const scenario: Scenario = {
      id: crypto.randomUUID(),
      name: autoName,
      nodes: active.nodes.map((n) => ({ ...n })),
      proposals: [],
      changeLog: [],
      rejectedSignatures: [],
      chat: [],
    };
    const scenarios = [...state.scenarios, scenario];
    set({
      scenarios,
      activeScenarioId: scenario.id,
      selectedNodeId: null,
      focusedProposalId: null,
      ...mirror(scenarios, scenario.id),
    });
  },

  switchScenario: (id) => {
    const state = get();
    if (!state.scenarios.find((s) => s.id === id)) return;
    set({
      activeScenarioId: id,
      selectedNodeId: null,
      focusedProposalId: null,
      ...mirror(state.scenarios, id),
    });
  },

  renameScenario: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set((state) => ({
      scenarios: state.scenarios.map((s) =>
        s.id === id ? { ...s, name: trimmed } : s,
      ),
    }));
  },

  deleteScenario: (id) => {
    const state = get();
    const idx = state.scenarios.findIndex((s) => s.id === id);
    if (idx <= 0) return; // cannot delete base
    const scenarios = state.scenarios.filter((s) => s.id !== id);
    const base = scenarios[0];
    set({
      scenarios,
      activeScenarioId: base.id,
      selectedNodeId: null,
      focusedProposalId: null,
      ...mirror(scenarios, base.id),
    });
  },
}));
