import { GoogleGenAI } from "@google/genai";
import type { Classification } from "../types";

const MODEL = "gemini-2.0-flash";

export class GeminiClient {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("API key de Gemini no configurada");
    this.client = new GoogleGenAI({ apiKey });
  }

  async classify(name: string): Promise<Classification> {
    const prompt = `Analice el siguiente texto: "${name}". ¿Es el nombre de una persona? Responda únicamente con la palabra 'PERSON' o 'COMPANY'.`;
    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
    const text = (response.text ?? "").trim().toUpperCase();
    if (text.includes("PERSON")) return "PERSON";
    if (text.includes("COMPANY")) return "COMPANY";
    return "UNKNOWN";
  }

  async findEmail(searchTerm: string): Promise<string> {
    const prompt = `Utilizando búsqueda web en google.cl, encuentre la dirección de correo electrónico de contacto principal para "${searchTerm}". Responda SÓLO con la dirección de correo o '(no encontrado)'. No agregue explicaciones.`;
    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    return extractEmail((response.text ?? "").trim());
  }
}

const EMAIL_REGEX = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

export function extractEmail(text: string): string {
  if (!text) return "(no encontrado)";
  const matches = text.match(EMAIL_REGEX);
  if (matches && matches.length > 0) return matches[0].toLowerCase();
  if (/no encontrado/i.test(text)) return "(no encontrado)";
  return "(no encontrado)";
}

export function isHardRateLimit(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b429\b|rate.?limit|too many requests|resource.?exhausted/i.test(
    message
  );
}
