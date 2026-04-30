import { useEffect, useMemo, useRef, useState } from "react";
import { FileUploader } from "./components/FileUploader";
import { BlacklistManager } from "./components/BlacklistManager";
import { ProcessingControls } from "./components/ProcessingControls";
import { StatusDisplay } from "./components/StatusDisplay";
import { ApiKeyInput } from "./components/ApiKeyInput";
import {
  buildOutputFileName,
  buildOutputWorkbook,
  downloadWorkbook,
  findFirstEmptyEmailRow,
  readWorkbook,
  type ParsedWorkbook,
} from "./lib/excel";
import { GeminiClient, isHardRateLimit } from "./lib/gemini";
import { isBlacklisted } from "./lib/blacklist";
import {
  clearSession,
  loadApiKey,
  loadBlacklist,
  loadSession,
  saveApiKey,
  saveBlacklist,
  saveSession,
  upsertResult,
} from "./lib/storage";
import type { LogEntry, ProcessedResult } from "./types";

const REQUEST_DELAY_MS = 800;
const MAX_LOGS = 100;

export default function App() {
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [results, setResults] = useState<Record<number, ProcessedResult>>({});
  const [blacklist, setBlacklist] = useState<string[]>(() => loadBlacklist());
  const [apiKey, setApiKey] = useState<string>(
    () => loadApiKey() || (import.meta.env.VITE_GEMINI_API_KEY ?? "")
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [startRow, setStartRow] = useState<number>(2);
  const [endRow, setEndRow] = useState<number>(2);
  const [isRunning, setIsRunning] = useState(false);
  const [currentRow, setCurrentRow] = useState<number | null>(null);

  const stopRef = useRef(false);

  useEffect(() => {
    const session = loadSession();
    if (session.fileName) setFileName(session.fileName);
    if (session.results) setResults(session.results);
  }, []);

  useEffect(() => {
    saveBlacklist(blacklist);
  }, [blacklist]);

  useEffect(() => {
    saveApiKey(apiKey);
  }, [apiKey]);

  const totalRowsInRange = useMemo(() => {
    if (!parsed) return 0;
    return parsed.rows.filter(
      (r) => r.rowNumber >= startRow && r.rowNumber <= endRow
    ).length;
  }, [parsed, startRow, endRow]);

  const processedInRange = useMemo(() => {
    if (!parsed) return 0;
    return parsed.rows
      .filter((r) => r.rowNumber >= startRow && r.rowNumber <= endRow)
      .filter((r) => results[r.rowNumber]).length;
  }, [parsed, results, startRow, endRow]);

  const counts = useMemo(() => {
    let found = 0;
    let notFound = 0;
    let excluded = 0;
    let errored = 0;
    for (const r of Object.values(results)) {
      if (r.status === "found") found++;
      else if (r.status === "not_found") notFound++;
      else if (r.status === "excluded") excluded++;
      else if (r.status === "error") errored++;
    }
    return { found, notFound, excluded, errored };
  }, [results]);

  const log = (level: LogEntry["level"], message: string) => {
    setLogs((prev) => {
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        level,
        message,
      };
      const next = [...prev, entry];
      if (next.length > MAX_LOGS) next.splice(0, next.length - MAX_LOGS);
      return next;
    });
  };

  const handleFile = async (file: File) => {
    try {
      const result = await readWorkbook(file);
      setParsed(result);
      setFileName(file.name);
      const minRow = result.rows[0]?.rowNumber ?? 2;
      const maxRow =
        result.rows[result.rows.length - 1]?.rowNumber ?? minRow;
      const suggested = findFirstEmptyEmailRow(result.rows);
      setStartRow(Math.max(suggested, minRow));
      setEndRow(maxRow);
      const session = loadSession();
      session.fileName = file.name;
      saveSession(session);
      log(
        "info",
        `Archivo cargado: ${file.name} · ${result.rows.length} filas detectadas. Sugerencia inicio: fila ${suggested}.`
      );
    } catch (err) {
      log("error", `No se pudo leer el archivo: ${stringifyError(err)}`);
    }
  };

  const handleClear = () => {
    clearSession();
    setParsed(null);
    setFileName(null);
    setResults({});
    setLogs([]);
    setStartRow(2);
    setEndRow(2);
    log("info", "Sesión limpiada.");
  };

  const handleStop = () => {
    stopRef.current = true;
    log("warn", "Solicitud de detención recibida...");
  };

  const handleStart = async () => {
    if (!parsed) return;
    if (!apiKey) {
      log("error", "Falta la clave de API de Gemini.");
      return;
    }
    if (startRow > endRow) {
      log("error", "La fila de inicio es mayor que la fila de fin.");
      return;
    }
    let client: GeminiClient;
    try {
      client = new GeminiClient(apiKey);
    } catch (err) {
      log("error", stringifyError(err));
      return;
    }

    stopRef.current = false;
    setIsRunning(true);
    log("info", `Iniciando procesamiento de filas ${startRow} a ${endRow}.`);

    const rowsToProcess = parsed.rows.filter(
      (r) => r.rowNumber >= startRow && r.rowNumber <= endRow
    );

    for (const row of rowsToProcess) {
      if (stopRef.current) {
        log("warn", "Procesamiento detenido por el usuario.");
        break;
      }
      setCurrentRow(row.rowNumber);

      try {
        const classification = await client.classify(row.holder || row.brand);
        log(
          "info",
          `Fila ${row.rowNumber}: "${row.holder}" → ${classification}`
        );

        const searchTerm =
          classification === "PERSON"
            ? row.brand || row.holder
            : row.holder || row.brand;

        if (!searchTerm) {
          finalizeRow(row.rowNumber, {
            rowNumber: row.rowNumber,
            holder: row.holder,
            brand: row.brand,
            period: row.period,
            classification,
            email: "(sin término de búsqueda)",
            status: "error",
            timestamp: Date.now(),
          });
          log("error", `Fila ${row.rowNumber}: sin término de búsqueda.`);
          await sleep(REQUEST_DELAY_MS);
          continue;
        }

        const rawEmail = await client.findEmail(searchTerm);
        const email = rawEmail.toLowerCase();
        const looksLikeEmail = email.includes("@");

        if (!looksLikeEmail) {
          finalizeRow(row.rowNumber, {
            rowNumber: row.rowNumber,
            holder: row.holder,
            brand: row.brand,
            period: row.period,
            classification,
            email: "(no encontrado)",
            status: "not_found",
            timestamp: Date.now(),
          });
          log(
            "warn",
            `Fila ${row.rowNumber}: no se encontró correo para "${searchTerm}".`
          );
        } else if (isBlacklisted(email, blacklist)) {
          finalizeRow(row.rowNumber, {
            rowNumber: row.rowNumber,
            holder: row.holder,
            brand: row.brand,
            period: row.period,
            classification,
            email,
            status: "excluded",
            message: "lista negra",
            timestamp: Date.now(),
          });
          log(
            "warn",
            `Fila ${row.rowNumber}: ${email} excluido por lista negra.`
          );
        } else {
          finalizeRow(row.rowNumber, {
            rowNumber: row.rowNumber,
            holder: row.holder,
            brand: row.brand,
            period: row.period,
            classification,
            email,
            status: "found",
            timestamp: Date.now(),
          });
          log("success", `Fila ${row.rowNumber}: ${email}`);
        }
      } catch (err) {
        const message = stringifyError(err);
        finalizeRow(row.rowNumber, {
          rowNumber: row.rowNumber,
          holder: row.holder,
          brand: row.brand,
          period: row.period,
          classification: "UNKNOWN",
          email: "(error)",
          status: "error",
          message,
          timestamp: Date.now(),
        });
        if (isHardRateLimit(err)) {
          log(
            "error",
            `Fila ${row.rowNumber}: rate limit (429). Esperando 5s antes de continuar.`
          );
          await sleep(5000);
        } else {
          log("error", `Fila ${row.rowNumber}: ${message}`);
        }
      }

      await sleep(REQUEST_DELAY_MS);
    }

    setCurrentRow(null);
    setIsRunning(false);
    log("info", "Procesamiento finalizado.");
  };

  const finalizeRow = (rowNumber: number, result: ProcessedResult) => {
    upsertResult(result);
    setResults((prev) => ({ ...prev, [rowNumber]: result }));
  };

  const handleDownload = () => {
    if (!parsed) return;
    const wb = buildOutputWorkbook(parsed, results);
    const fileNameOut = buildOutputFileName(parsed.rows);
    downloadWorkbook(wb, fileNameOut);
    log("success", `Archivo generado: ${fileNameOut}`);
  };

  const minRow = parsed?.rows[0]?.rowNumber ?? 2;
  const maxRow =
    parsed?.rows[parsed.rows.length - 1]?.rowNumber ?? minRow;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
            Buscador de Correos · Vencimientos de Marcas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cargue su Excel, defina la lista negra y deje que la IA encuentre
            los correos de contacto. Se usa{" "}
            <span className="font-mono text-brand-400">gemini-2.0-flash</span>{" "}
            con búsqueda web en google.cl.
          </p>
        </header>

        <ApiKeyInput apiKey={apiKey} onChange={setApiKey} />

        <FileUploader
          fileName={fileName}
          onFile={handleFile}
          onClear={handleClear}
          disabled={isRunning}
        />

        <BlacklistManager items={blacklist} onChange={setBlacklist} />

        <ProcessingControls
          startRow={startRow}
          endRow={endRow}
          minRow={minRow}
          maxRow={maxRow}
          isRunning={isRunning}
          canStart={!!parsed && !!apiKey}
          onChangeStart={setStartRow}
          onChangeEnd={setEndRow}
          onStart={handleStart}
          onStop={handleStop}
          onDownload={handleDownload}
          hasResults={Object.keys(results).length > 0}
        />

        <StatusDisplay
          logs={logs}
          processed={processedInRange}
          total={totalRowsInRange}
          currentRow={currentRow}
          found={counts.found}
          notFound={counts.notFound}
          excluded={counts.excluded}
          errored={counts.errored}
        />

        <footer className="text-xs text-slate-600 text-center pt-4">
          Datos guardados localmente en su navegador (localStorage). Ningún
          archivo se sube a un servidor propio.
        </footer>
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function stringifyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
