import { useState } from "react";

interface ApiKeyInputProps {
  apiKey: string;
  onChange: (value: string) => void;
}

export function ApiKeyInput({ apiKey, onChange }: ApiKeyInputProps) {
  const [visible, setVisible] = useState(false);
  const fromEnv = !!import.meta.env.VITE_GEMINI_API_KEY;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-lg font-semibold text-slate-100 mb-2">
        Clave de API de Gemini
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        {fromEnv
          ? "Detectada en VITE_GEMINI_API_KEY (archivo .env)."
          : "Pegue su clave aquí. Se guardará sólo en este navegador (localStorage)."}
      </p>
      <div className="flex gap-2">
        <input
          type={visible ? "text" : "password"}
          value={apiKey}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fromEnv ? "(usando .env)" : "AIza..."}
          className="flex-1 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={() => setVisible((v) => !v)}
          className="px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm"
        >
          {visible ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </div>
  );
}
