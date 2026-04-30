import { useEffect, useRef } from "react";
import type { LogEntry } from "../types";

interface StatusDisplayProps {
  logs: LogEntry[];
  processed: number;
  total: number;
  currentRow: number | null;
  found: number;
  notFound: number;
  excluded: number;
  errored: number;
}

export function StatusDisplay({
  logs,
  processed,
  total,
  currentRow,
  found,
  notFound,
  excluded,
  errored,
}: StatusDisplayProps) {
  const logBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-lg font-semibold text-slate-100 mb-3">4. Estado</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Encontrados" value={found} accent="text-emerald-400" />
        <Stat label="No encontrados" value={notFound} accent="text-amber-400" />
        <Stat label="Excluidos" value={excluded} accent="text-sky-400" />
        <Stat label="Errores" value={errored} accent="text-rose-400" />
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          {processed} / {total} filas procesadas
          {currentRow ? ` · trabajando fila ${currentRow}` : ""}
        </span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div
        ref={logBoxRef}
        className="bg-black/60 border border-slate-800 rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs space-y-0.5"
      >
        {logs.length === 0 ? (
          <p className="text-slate-600">
            Esperando inicio del procesamiento...
          </p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={levelClass(log.level)}>
              <span className="text-slate-500">
                [{formatTime(log.timestamp)}]
              </span>{" "}
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-2xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

function levelClass(level: LogEntry["level"]) {
  switch (level) {
    case "success":
      return "text-emerald-400";
    case "warn":
      return "text-amber-400";
    case "error":
      return "text-rose-400";
    default:
      return "text-slate-300";
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour12: false });
}
