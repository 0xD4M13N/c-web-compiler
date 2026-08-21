import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import Editor from "@monaco-editor/react";
import "./styles.css";


// Code par défaut affiché dans l'éditeur
const DEFAULT_CODE = `#include <stdio.h>

int main(void)
{
    printf("Hello, World!\\n");
    return 0;
}
`;

// Composant principal de l'application
function App() {

  const [code, setCode] = useState(() =>
    localStorage.getItem("c-compiler-code") || DEFAULT_CODE
  );
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Prêt");
  const [duration, setDuration] = useState(null);
  const [running, setRunning] = useState(false);
  const codeRef = useRef(code);
  const stdinRef = useRef(stdin);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    stdinRef.current = stdin;
  }, [stdin]);

  useEffect(() => {
    localStorage.setItem("c-compiler-code", code);
  }, [code]);

  // Fonction pour exécuter le code C en envoyant une requête à l'API backend
  async function runCode() {
    if (running) return;

    setRunning(true);
    setStatus("Compilation…");
    setOutput("");
    setError("");
    setDuration(null);

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeRef.current, stdin: stdinRef.current })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur HTTP");
      }

      setOutput(result.stdout || "");

      if (result.stderr) {
        setError(result.stderr);
      }

      setDuration(result.durationMs);

      if (result.phase === "compile") {
        setStatus("Erreur de compilation");
      } else if (result.success) {
        setStatus("Terminé");
      } else {
        setStatus(result.signal ? `Arrêté (${result.signal})` : `Code de sortie ${result.exitCode}`);
      }
    } catch (err) {
      setStatus("Erreur");
      setError(err.message || "Impossible de contacter le serveur.");
    } finally {
      setRunning(false);
    }
  }

  // Fonction pour réinitialiser l'éditeur et les sorties
  function reset() {
    setCode(DEFAULT_CODE);
    setStdin("");
    setOutput("");
    setError("");
    setDuration(null);
    setStatus("Prêt");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">C</div>
          <div>
            <h1>C Web Compiler - by 0xD4M13N</h1>
            <span>Compilateur C local</span>
          </div>
        </div>

        <div className="actions">
          <button className="secondary" onClick={reset}>Réinitialiser</button>
          <button className="run" onClick={runCode} disabled={running}>
            {running ? "Exécution…" : "▶ Exécuter"}
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="editor-panel">
          <div className="panel-title">
            <span>main.c</span>
            <span className="hint">Ctrl + Entrée pour exécuter</span>
          </div>

          <div className="editor">
            <Editor
              height="100%"
              defaultLanguage="c"
              language="c"
              value={code}
              onChange={value => setCode(value ?? "")}
              theme="vs-dark"
              options={{
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 15,
                tabSize: 4,
                insertSpaces: true,
                wordWrap: "off",
                padding: { top: 12 },
                scrollBeyondLastLine: false
              }}
              onMount={(editor, monaco) => {
                editor.addCommand(
                  monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                  runCode
                );
              }}
            />
          </div>
        </section>

        <aside className="side-panel">
          <section className="card stdin-card">
            <div className="card-title">Entrée standard (stdin)</div>
            <textarea
              value={stdin}
              onChange={e => setStdin(e.target.value)}
              placeholder="Valeurs lues par scanf(), fgets(), etc."
              spellCheck="false"
            />
          </section>

          <section className="card output-card">
            <div className="card-title output-title">
              <span>Sortie</span>
              <span className={`status ${running ? "busy" : ""}`}>{status}</span>
            </div>

            <div className="terminal">
              {output && <pre className="stdout">{output}</pre>}
              {error && <pre className="stderr">{error}</pre>}
              {!output && !error && <span className="placeholder">La sortie du programme apparaîtra ici…</span>}
            </div>

            {duration !== null && (
              <div className="duration">Temps d'exécution : {duration} ms</div>
            )}
          </section>
        </aside>
      </main>

      <footer>
        <span>GCC · C17 · Docker sandbox</span>
        <span>Exécution locale uniquement</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
