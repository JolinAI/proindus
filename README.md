# Buscador de Correos · Vencimientos de Marcas

Aplicación web (React + Vite + TypeScript) que recibe un Excel con vencimientos
de marcas registradas y, fila por fila, usa Gemini con búsqueda web (`google.cl`)
para encontrar el correo de contacto del titular.

## Cómo se usa

1. Cargue su archivo Excel (`.xlsx` / `.xls`).
2. Configure (opcional) la lista negra de correos / dominios a excluir.
3. Pegue su clave de API de Gemini (o defínala en `.env` como
   `VITE_GEMINI_API_KEY`).
4. Ajuste fila de inicio y fin, luego presione **Iniciar búsqueda**.
5. Cuando termine — o en cualquier momento — descargue el Excel resultante con
   **Actualizar archivo**.

### Formato esperado del Excel

| Columna | Contenido                                |
| ------- | ---------------------------------------- |
| D       | Nombre del titular / empresa             |
| E       | Destino del correo encontrado (salida)   |
| F       | Fecha o período (usado en el nombre)     |
| G       | Marca o referencia asociada              |

La fila 1 es la cabecera y se preserva tal cual en la salida.

## Lógica de procesamiento

- **Clasificación:** se pregunta a Gemini si el nombre de la columna D es una
  `PERSON` o `COMPANY`.
- **Búsqueda:**
  - `PERSON` → buscar correo a partir de la marca (columna G).
  - `COMPANY` → buscar correo a partir del nombre (columna D).
- **Modelo:** `gemini-2.0-flash` con la herramienta `googleSearch` activada.
- **Rate limit:** delay de 800 ms entre filas; en error 429 espera 5 s extra.
- **Persistencia:** cada resultado se guarda en `localStorage`. Si la página se
  recarga, los resultados se conservan y la sugerencia de "fila de inicio"
  detecta automáticamente la primera fila vacía.
- **Lista negra:** correos cuyo dominio coincida son marcados como
  `(excluded)`.

## Salida

Pestaña **Resultados** del Excel exportado:

1. Filas con correo válido (parte superior).
2. Separador.
3. Filas con error / exclusión / no encontrado (parte inferior).

## Desarrollo

```bash
npm install
cp .env.example .env   # opcional: pegar VITE_GEMINI_API_KEY
npm run dev
```

Build de producción:

```bash
npm run build
npm run preview
```

## Notas

- Los datos del archivo cargado y las claves no salen del navegador.
- Si la clave de Gemini se inyecta vía `.env`, NO se incluye en el bundle
  bajo ningún prefijo distinto a `VITE_*` y se almacena solamente en memoria
  del cliente.
