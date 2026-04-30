import { useState } from "react";
import { normalizeBlacklistEntry } from "../lib/blacklist";

interface BlacklistManagerProps {
  items: string[];
  onChange: (items: string[]) => void;
}

export function BlacklistManager({ items, onChange }: BlacklistManagerProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = normalizeBlacklistEntry(draft);
    if (!value) return;
    if (items.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...items, value]);
    setDraft("");
  };

  const remove = (entry: string) => {
    onChange(items.filter((i) => i !== entry));
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-lg font-semibold text-slate-100 mb-3">
        2. Lista negra de correos / dominios
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        Ingrese un correo (<span className="font-mono">soporte@empresa.cl</span>
        ) o un dominio (<span className="font-mono">@uchile.cl</span>{" "}
        o <span className="font-mono">uchile.cl</span>).
      </p>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="@dominio.cl o correo@dominio.cl"
          className="flex-1 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={add}
          className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium"
        >
          Añadir
        </button>
      </div>
      {items.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {items.map((entry) => (
            <li
              key={entry}
              className="flex items-center gap-2 bg-slate-800 rounded-full pl-3 pr-1 py-1 text-xs text-slate-200"
            >
              <span className="font-mono">{entry}</span>
              <button
                onClick={() => remove(entry)}
                className="bg-slate-700 hover:bg-rose-700 rounded-full w-5 h-5 flex items-center justify-center text-slate-300 hover:text-white"
                aria-label={`Eliminar ${entry}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
