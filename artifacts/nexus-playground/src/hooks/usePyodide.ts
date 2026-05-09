import { useState, useEffect, useRef } from "react";

type PyodideStatus = "idle" | "loading" | "ready" | "error";

interface UsePyodideReturn {
  status: PyodideStatus;
  runCode: (code: string) => Promise<{ output: string; error: string | null }>;
}

export function usePyodide(): UsePyodideReturn {
  const pyodideRef = useRef<any>(null);
  const [status, setStatus] = useState<PyodideStatus>("idle");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    
    async function loadPy() {
      try {
        const { loadPyodide } = await import("pyodide");
        const py = await loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/",
        });
        if (!cancelled) {
          pyodideRef.current = py;
          setStatus("ready");
        }
      } catch (err) {
        console.error("Pyodide load error:", err);
        if (!cancelled) setStatus("error");
      }
    }
    
    loadPy();
    return () => { cancelled = true; };
  }, []);

  const runCode = async (code: string) => {
    if (!pyodideRef.current) return { output: "", error: "Python not loaded yet" };
    let output = "";
    try {
      pyodideRef.current.setStdout({ batched: (s: string) => { output += s + "\n"; } });
      pyodideRef.current.setStderr({ batched: (s: string) => { output += "ERR: " + s + "\n"; } });
      await pyodideRef.current.runPythonAsync(code);
      return { output: output.trim(), error: null };
    } catch (e: any) {
      return { output: output.trim(), error: String(e) };
    }
  };

  return { status, runCode };
}
