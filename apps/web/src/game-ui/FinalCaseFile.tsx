import { Copy, Home, RotateCcw } from "lucide-react";
import type { MatchSummary } from "@agent-alibi/shared";

type FinalCaseFileProps = {
  summary: MatchSummary;
  onRematch: () => void;
  onHome: () => void;
};

export function FinalCaseFile({ summary, onRematch, onHome }: FinalCaseFileProps) {
  async function copyResult() {
    await navigator.clipboard?.writeText(summary.caseFile).catch(() => undefined);
  }

  return (
    <main className="final-shell">
      <section className="case-file">
        <p className="eyebrow">Final Case File</p>
        <h1>{summary.title}</h1>
        <pre>{summary.caseFile}</pre>
        <div className="final-actions">
          <button onClick={copyResult}>
            <Copy aria-hidden="true" size={18} />
            Copy Result
          </button>
          <button onClick={onRematch}>
            <RotateCcw aria-hidden="true" size={18} />
            Rematch
          </button>
          <button onClick={onHome}>
            <Home aria-hidden="true" size={18} />
            Home
          </button>
        </div>
      </section>
    </main>
  );
}
