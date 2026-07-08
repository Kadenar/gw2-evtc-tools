import { useState } from "react";
import { TriggerRewriter } from "./components/TriggerRewriter";
import { RunHistory } from "./components/RunHistory";
import { SessionTimer } from "./components/SessionTimer";
import "./styles.css";

type Tool = "rewriter" | "timer" | "history";

export default function App() {
  const [tool, setTool] = useState<Tool>("rewriter");

  const tabClass = (active: boolean) =>
    `cursor-pointer rounded-full px-4 py-[0.7rem] ${
      active ? "bg-accent font-extrabold text-[#1f1409]" : "bg-transparent text-fg"
    }`;

  return (
    <main className="mx-auto w-[min(1720px,calc(100vw-2rem))] pt-5 pb-12 max-nav:w-[min(100vw-1rem,1720px)] max-nav:pt-4">
      <header className="mb-4">
        <div>
          <h1 className="m-0 text-[2rem] leading-[1.1]">GW2 Log Tools</h1>
        </div>
      </header>

      <nav
        className="mb-4 inline-flex gap-2 rounded-full border border-line bg-white/[0.06] p-[0.35rem]"
        aria-label="Tools"
      >
        <button type="button" className={tabClass(tool === "rewriter")} onClick={() => setTool("rewriter")}>
          ID Rewriter
        </button>
        <button type="button" className={tabClass(tool === "timer")} onClick={() => setTool("timer")}>
          Raid Session Timer
        </button>
        <button type="button" className={tabClass(tool === "history")} onClick={() => setTool("history")}>
          Run History
        </button>
      </nav>

      {tool === "rewriter" ? <TriggerRewriter /> : null}
      {tool === "timer" ? <SessionTimer /> : null}
      {tool === "history" ? <RunHistory /> : null}
    </main>
  );
}
