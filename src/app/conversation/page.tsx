import { Suspense } from "react";
import { Assessment } from "@/components/assessment";
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
        liveEnabled={Boolean(
          process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID,
        )}
      />
    </Suspense>
  );
}
