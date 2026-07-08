import { useState } from "react";
import { TriggerRewriter } from "./components/TriggerRewriter";
import { RunHistory } from "./components/RunHistory";
import { SessionTimer } from "./components/SessionTimer";
import "./styles.css";

type Tool = "rewriter" | "timer" | "history";

export default function App() {
  const [tool, setTool] = useState<Tool>("rewriter");

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>EVTC Tools</h1>
          <p>Frontend-only tools for supported EVTC rewrites and raid session timing.</p>
        </div>
      </header>

      <nav className="tabs" aria-label="Tools">
        <button type="button" className={tool === "rewriter" ? "active" : ""} onClick={() => setTool("rewriter")}>
          Trigger Rewriter
        </button>
        <button type="button" className={tool === "timer" ? "active" : ""} onClick={() => setTool("timer")}>
          Raid Session Timer
        </button>
        <button type="button" className={tool === "history" ? "active" : ""} onClick={() => setTool("history")}>
          Run History
        </button>
      </nav>

      {tool === "rewriter" ? <TriggerRewriter /> : null}
      {tool === "timer" ? <SessionTimer /> : null}
      {tool === "history" ? <RunHistory /> : null}
    </main>
  );
}
