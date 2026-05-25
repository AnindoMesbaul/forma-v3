import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/forma/TopBar";
import { AgentPanel } from "@/components/forma/AgentPanel";
import { Canvas } from "@/components/forma/Canvas";
import { NodeDetail } from "@/components/forma/NodeDetail";
import { ChatBar } from "@/components/forma/ChatBar";
import { EmptyDropZone } from "@/components/forma/EmptyDropZone";
import { MultiUploadZone } from "@/components/forma/MultiUploadZone";
import { DataReviewTable } from "@/components/forma/DataReviewTable";
import { ScenarioTabBar } from "@/components/forma/ScenarioTabBar";
import { ScenarioCompare } from "@/components/forma/ScenarioCompare";
import { useForma } from "@/lib/forma/store";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Forma — AI Org Design Canvas" },
      {
        name: "description",
        content:
          "Upload your org chart and collaborate with an AI agent to redesign your organisation.",
      },
    ],
  }),
});

function Index() {
  const { nodes, selectedNodeId, appPhase, comparisonMode } = useForma();
  const selected = nodes.find((n) => n.id === selectedNodeId) ?? null;

  if (appPhase === "upload" || appPhase === "processing") {
    return (
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        <TopBar />
        <main className="relative flex-1 overflow-hidden">
          <MultiUploadZone />
        </main>
      </div>
    );
  }

  if (appPhase === "reviewing") {
    return <DataReviewTable />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <TopBar />
      <ScenarioTabBar />
      <div className="flex min-h-0 flex-1">
        <AgentPanel />
        {comparisonMode ? (
          <main className="relative min-h-0 flex-1 overflow-hidden">
            <ScenarioCompare />
          </main>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <main className="relative min-h-0 flex-1">
                {nodes.length === 0 ? <EmptyDropZone /> : <Canvas />}
              </main>
              <ChatBar />
            </div>
            {selected && <NodeDetail node={selected} />}
          </>
        )}
      </div>
    </div>
  );
}
