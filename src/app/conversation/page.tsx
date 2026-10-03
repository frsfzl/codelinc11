import { Suspense } from "react";
import { Assessment } from "@/components/assessment";
import { speechConfigured } from "@/lib/transcription";
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
        liveEnabled={Boolean(
          process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID,
        )}
      />
    </Suspense>
  );
}
