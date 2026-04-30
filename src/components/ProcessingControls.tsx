interface ProcessingControlsProps {
  startRow: number;
  endRow: number;
  minRow: number;
  maxRow: number;
  isRunning: boolean;
  canStart: boolean;
  onChangeStart: (value: number) => void;
  onChangeEnd: (value: number) => void;
  onStart: () => void;
  onStop: () => void;
  onDownload: () => void;
  hasResults: boolean;
}

export function ProcessingControls({
  startRow,
  endRow,
  minRow,
  maxRow,
  isRunning,
  canStart,
  onChangeStart,
  onChangeEnd,
  onStart,
  onStop,
  onDownload,
  hasResults,
}: ProcessingControlsProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-lg font-semibold text-slate-100 mb-3">
        3. Procesamiento
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <label className="text-sm text-slate-300">
          <span className="block text-xs text-slate-400 mb-1">
            Fila de inicio
          </span>
          <input
            type="number"
            min={minRow}
            max={maxRow}
            value={startRow}
            disabled={isRunning}
            onChange={(e) => onChangeStart(Number(e.target.value))}
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-500 disabled:opacity-50"
          />
        </label>
        <label className="text-sm text-slate-300">
          <span className="block text-xs text-slate-400 mb-1">Fila de fin</span>
          <input
            type="number"
            min={minRow}
            max={maxRow}
            value={endRow}
            disabled={isRunning}
            onChange={(e) => onChangeEnd(Number(e.target.value))}
            className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-500 disabled:opacity-50"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {!isRunning ? (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium"
          >
            Iniciar búsqueda
          </button>
        ) : (
          <button
            onClick={onStop}
            className="px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium"
          >
            Detener
          </button>
        )}
        <button
          onClick={onDownload}
          disabled={!hasResults}
          className="px-4 py-2 rounded-md bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium"
        >
          Actualizar archivo (descargar)
        </button>
      </div>
    </div>
  );
}
