import { execFile } from "node:child_process";
import { mkdtemp, writeFile, readFile, readdir, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { extractTaxFacts } from "./taxDocumentFacts";

let activeExtractions = 0;

function tesseractBinary(): string {
  if (process.env.TESSERACT_BIN) return process.env.TESSERACT_BIN;
  // Existing Windows dev processes do not inherit the installer's PATH update.
  // Production Linux uses the packaged executable on PATH.
  const installed = join(process.env.ProgramFiles || "C:\\Program Files", "Tesseract-OCR", "tesseract.exe");
  return process.platform === "win32" && existsSync(installed) ? installed : "tesseract";
}

export class PrivateExtractionError extends Error {
  constructor() {
    super("We could not read this document privately. Please upload a clearer PDF or try again later. Your document has not been sent to an AI provider.");
  }
}

function run(binary: string, args: string[], timeout = 60_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(binary, args, { timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, (error, stdout) => {
      // Never propagate subprocess stderr: PDF text or passwords may occur in it.
      if (error) reject(new PrivateExtractionError());
      else resolve(stdout);
    });
  });
}

/** Local Poppler extraction and Tesseract OCR. No network or AI fallback.
 * Scratch PDFs/images/text live in a private temp directory, never web-served,
 * and are removed on success and failure. The OS temp volume must be encrypted
 * and excluded from backups in production. A process kill requires host cleanup.
 */
export async function extractPrivateTaxText(buffer: Buffer, password?: string): Promise<string> {
  if (activeExtractions >= 2) throw new PrivateExtractionError();
  activeExtractions++;
  let folder: string | undefined;
  try {
    folder = await mkdtemp(join(tmpdir(), "aitaxbot-private-"));
    await chmod(folder, 0o700);
    const input = join(folder, "document.pdf");
    await writeFile(input, buffer, { mode: 0o600 });
    const unlock = password ? ["-upw", password] : [];
    const info = await run(process.env.PDFINFO_BIN || "pdfinfo", [...unlock, input]);
    const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
    if (!Number.isInteger(pages) || pages < 1 || pages > 20) throw new PrivateExtractionError();
    const output: string[] = [];
    const deadline = Date.now() + 120_000;
    // Per-page fallback also handles mixed text/scanned PDFs. Bound page count,
    // resolution, subprocess duration and output size before processing uploads.
    for (let page = 1; page <= pages; page++) {
      if (Date.now() > deadline) throw new PrivateExtractionError();
      let text = await run(process.env.PDFTOTEXT_BIN || "pdftotext", [
        ...unlock, "-f", String(page), "-l", String(page), "-layout", input, "-",
      ]);
      const pageFacts = extractTaxFacts(text);
      if (!pageFacts.observations.length && !pageFacts.tdsTransactions.length) {
        const prefix = join(folder, `page-${page}`);
        await run(process.env.PDFTOPPM_BIN || "pdftoppm", [
          ...unlock, "-f", String(page), "-l", String(page), "-singlefile", "-scale-to", "2400", "-png", input, prefix,
        ]);
        await run(tesseractBinary(), [prefix + ".png", prefix, "-l", "eng", "--psm", "6"]);
        text = await readFile(prefix + ".txt", "utf8");
        // Remove raster and OCR output promptly, rather than after every page.
        for (const name of await readdir(folder)) {
          if (name.startsWith(`page-${page}.`)) await rm(join(folder, name), { force: true });
        }
      }
      output.push(text);
    }
    return output.join("\n");
  } catch {
    throw new PrivateExtractionError();
  } finally {
    try { if (folder) await rm(folder, { recursive: true, force: true }); }
    finally { activeExtractions--; }
  }
}
