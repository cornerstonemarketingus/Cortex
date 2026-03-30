"use client";

import { useRouter } from "next/navigation";
import BuilderCopilotPanel from "@/components/copilot/BuilderCopilotPanel";

export default function WorkspaceCopilot({ defaultPrompt }: { defaultPrompt?: string }) {
  const router = useRouter();

  const handleAction = (action: { type: string; payload?: any }) => {
    const prompt = action.payload?.prompt || "";
    try {
      if (action.type === "CREATE_ESTIMATE") {
        router.push(`/estimate?prompt=${encodeURIComponent(prompt)}`);
      } else if (action.type === "CREATE_PAGE") {
        router.push(`/website-builder?prompt=${encodeURIComponent(prompt)}`);
      } else if (action.type === "CREATE_AUTOMATION") {
        router.push(`/automations?prompt=${encodeURIComponent(prompt)}`);
      }
    } catch (e) {
      // swallow navigation errors in client
    }
  };

  return (
    <div>
      <BuilderCopilotPanel
        title="Workspace Copilot"
        subtitle="Route tasks to Estimates, Page Builder, or Automations."
        defaultPrompt={defaultPrompt}
        buildMode="website"
        onAction={handleAction}
      />
    </div>
  );
}
