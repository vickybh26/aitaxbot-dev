/**
 * Ambient type declarations for packages that lack proper .d.ts files
 * in the installed version.
 */

// ── jsPDF ──────────────────────────────────────────────────────────────────
declare module 'jspdf' {
  interface jsPDFOptions {
    orientation?: 'p' | 'portrait' | 'l' | 'landscape';
    unit?: 'pt' | 'px' | 'in' | 'mm' | 'cm' | 'ex' | 'em' | 'pc';
    format?: string | [number, number];
    compress?: boolean;
  }

  class jsPDF {
    constructor(options?: jsPDFOptions | string, unit?: string, format?: string | [number, number]);
    text(text: string | string[], x: number, y: number, options?: Record<string, unknown>): jsPDF;
    setFontSize(size: number): jsPDF;
    setFont(fontName: string, fontStyle?: string): jsPDF;
    setTextColor(r: number, g?: number, b?: number): jsPDF;
    setFillColor(r: number, g?: number, b?: number): jsPDF;
    setDrawColor(r: number, g?: number, b?: number): jsPDF;
    setLineWidth(width: number): jsPDF;
    rect(x: number, y: number, w: number, h: number, style?: string): jsPDF;
    line(x1: number, y1: number, x2: number, y2: number): jsPDF;
    addPage(format?: string | [number, number], orientation?: string): jsPDF;
    addImage(imageData: string | HTMLImageElement | HTMLCanvasElement, format: string, x: number, y: number, w: number, h: number): jsPDF;
    save(filename?: string): jsPDF;
    output(type?: string, options?: Record<string, unknown>): string | ArrayBuffer;
    getNumberOfPages(): number;
    setPage(pageNumber: number): jsPDF;
    internal: {
      pageSize: { getWidth(): number; getHeight(): number };
      pages: unknown[];
      scaleFactor: number;
    };
    splitTextToSize(text: string, maxLen: number): string[];
    getTextWidth(text: string): number;
    getFontSize(): number;
  }

  export = jsPDF;
}

// ── @hookform/resolvers/zod ────────────────────────────────────────────────
declare module '@hookform/resolvers/zod' {
  import type { ZodType, ZodTypeDef } from 'zod';
  import type { Resolver, FieldValues } from 'react-hook-form';

  export function zodResolver<
    TFieldValues extends FieldValues = FieldValues,
    TContext = unknown
  >(
    schema: ZodType<TFieldValues, ZodTypeDef, unknown>,
    schemaOptions?: object,
    factoryOptions?: { mode?: 'async' | 'sync'; raw?: boolean }
  ): Resolver<TFieldValues, TContext>;
}
