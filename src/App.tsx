import { useEffect, useState } from "react";
import { themeChange } from "theme-change";
import { TriggerRewriter } from "./components/TriggerRewriter";
import { RunHistory } from "./components/RunHistory";
import { SessionTimer } from "./components/SessionTimer";
import "./styles.css";

type Tool = "rewriter" | "timer" | "history";

const REPO_URL = "https://github.com/Kadenar/gw2-evtc-tools";

const TABS: Array<{ id: Tool; label: string }> = [
  { id: "rewriter", label: "ID Rewriter" },
  { id: "timer", label: "Raid Session Timer" },
  { id: "history", label: "Run History" },
];

export default function App() {
  const [tool, setTool] = useState<Tool>("rewriter");

  useEffect(() => {
    themeChange(false);
  }, []);

  return (
    <div className="min-h-screen">
      <header className="navbar mx-auto w-[min(1720px,calc(100vw-2rem))] gap-2 px-0">
        <div className="navbar-start">
          <span className="text-xl font-black tracking-tight">GW2 Log Tools</span>
        </div>

        <nav role="tablist" className="navbar-center join hidden md:inline-flex" aria-label="Tools">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              className={`btn join-item ${tool === id ? "btn-primary" : "btn-ghost"}`}
              aria-selected={tool === id}
              onClick={() => setTool(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="navbar-end gap-1">
          <ThemeToggle />
          <a
            className="btn btn-ghost btn-circle"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="View source on GitHub"
            title="View source on GitHub"
          >
            <GitHubIcon />
          </a>
        </div>
      </header>

      {/* Tabs collapse under the title on narrow screens. */}
      <nav role="tablist" className="join mx-auto mb-4 flex w-[min(1720px,calc(100vw-2rem))] md:hidden" aria-label="Tools">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`btn join-item flex-1 ${tool === id ? "btn-primary" : "btn-ghost"}`}
            aria-selected={tool === id}
            onClick={() => setTool(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="mx-auto w-[min(1720px,calc(100vw-2rem))] pb-12">
        {tool === "rewriter" ? <TriggerRewriter /> : null}
        {tool === "timer" ? <SessionTimer /> : null}
        {tool === "history" ? <RunHistory /> : null}
      </main>
    </div>
  );
}

function ThemeToggle() {
  return (
    <label className="btn btn-ghost btn-circle swap swap-rotate" aria-label="Toggle light/dark theme">
      {/* theme-change flips data-theme on <html> and persists the choice. */}
      <input type="checkbox" data-toggle-theme="dark,light" data-act-class="ACTIVE" />
      <svg className="swap-off h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M5.64 17l-.71.71a1 1 0 0 0 1.41 1.41l.71-.71A1 1 0 0 0 5.64 17zM5 12a1 1 0 0 0-1-1H3a1 1 0 0 0 0 2h1a1 1 0 0 0 1-1zm7-7a1 1 0 0 0 1-1V3a1 1 0 0 0-2 0v1a1 1 0 0 0 1 1zM5.64 7.05a1 1 0 0 0 .7.29 1 1 0 0 0 .71-.29 1 1 0 0 0 0-1.41l-.71-.71a1 1 0 0 0-1.41 1.41zM17 5.64a1 1 0 0 0 .7-.29l.71-.71a1 1 0 1 0-1.41-1.41l-.71.71A1 1 0 0 0 17 5.64zM21 11h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0-2zm-2.36 6a1 1 0 0 0-1.41 1.41l.71.71a1 1 0 0 0 1.41-1.41zM12 6.5A5.5 5.5 0 1 0 17.5 12 5.51 5.51 0 0 0 12 6.5zm0 9A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5zm0 3.5a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1z" />
      </svg>
      <svg className="swap-on h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M21.64 13a1 1 0 0 0-1.05-.14 8.05 8.05 0 0 1-3.37.73 8.15 8.15 0 0 1-8.14-8.1 8.59 8.59 0 0 1 .25-2A1 1 0 0 0 8 2.36a10.14 10.14 0 1 0 14 11.69 1 1 0 0 0-.36-1.05zm-9.5 6.69A8.14 8.14 0 0 1 7.08 5.22v.27a10.15 10.15 0 0 0 10.14 10.14 9.79 9.79 0 0 0 2.1-.22 8.11 8.11 0 0 1-7.18 4.32z" />
      </svg>
    </label>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54a3.05 3.05 0 0 0-1.28-1.68c-1.05-.72.08-.7.08-.7a2.42 2.42 0 0 1 1.76 1.19 2.45 2.45 0 0 0 3.35.96 2.46 2.46 0 0 1 .73-1.54c-2.55-.29-5.23-1.28-5.23-5.7a4.46 4.46 0 0 1 1.19-3.1 4.15 4.15 0 0 1 .11-3.05s.97-.31 3.18 1.18a10.95 10.95 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18a4.15 4.15 0 0 1 .12 3.05 4.45 4.45 0 0 1 1.18 3.1c0 4.43-2.69 5.4-5.25 5.69a2.75 2.75 0 0 1 .78 2.13v3.16c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}
