import { useDropzone } from "react-dropzone";
import { useCallback } from "react";

interface FileUploaderProps {
  fileName: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
  disabled?: boolean;
}

export function FileUploader({
  fileName,
  onFile,
  onClear,
  disabled,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFile(accepted[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    disabled,
  });

  const handleClear = () => {
    const ok = window.confirm(
      "¿Limpiar todos los datos? Se eliminará el archivo cargado y los resultados guardados."
    );
    if (ok) onClear();
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-100">
          1. Cargar archivo Excel
        </h2>
        {fileName && (
          <button
            onClick={handleClear}
            className="text-xs px-3 py-1 rounded-md bg-rose-900/50 hover:bg-rose-900 text-rose-200 border border-rose-800"
          >
            Limpiar datos
          </button>
        )}
      </div>

      <div
        {...getRootProps()}
        className={[
          "rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition",
          isDragActive
            ? "border-brand-500 bg-brand-500/10"
            : "border-slate-700 bg-slate-950/40 hover:border-slate-500",
          disabled ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
      >
        <input {...getInputProps()} />
        {fileName ? (
          <div>
            <p className="text-slate-300">
              Archivo cargado:{" "}
              <span className="font-mono text-brand-400">{fileName}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Arrastre otro archivo o haga clic para reemplazar.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-slate-300">
              Arrastre aquí su archivo .xlsx / .xls
            </p>
            <p className="text-xs text-slate-500 mt-1">
              o haga clic para seleccionar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
