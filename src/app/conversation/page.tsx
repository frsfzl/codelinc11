import { Suspense } from "react";
import { Assessment } from "@/components/assessment";
import { speechConfigured } from "@/lib/transcription";
import { agentConfigured } from "@/lib/agent-session";
export const dynamic = "force-dynamic";
export default function ConversationPage() {
  return (
    <Suspense
      fallback={
        <main id="main" className="page-loading">
          Getting things ready…
        </main>
      }
    >
      <Assessment
        speechEnabled={speechConfigured()}
        liveEnabled={agentConfigured()}
      />
    </Suspense>
  );
}
