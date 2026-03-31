declare module 'pdfkit' {
  type TextAlign = 'left' | 'center' | 'right' | 'justify';

  interface ImageOptions {
    fit?: [number, number];
    align?: TextAlign;
    valign?: 'top' | 'center' | 'bottom';
  }

  interface TextOptions {
    width?: number;
    align?: TextAlign;
  }

  interface PDFPage {
    width: number;
    height: number;
  }

  class PDFDocument {
    page: PDFPage;

    constructor(options?: unknown);

    on(event: string, listener: (...args: unknown[]) => void): this;
    end(): void;
    addPage(): this;
    rect(x: number, y: number, width: number, height: number): this;
    roundedRect(x: number, y: number, width: number, height: number, radius: number): this;
    fill(color?: string): this;
    stroke(color?: string): this;
    fillAndStroke(fillColor: string, strokeColor: string): this;
    fillColor(color: string): this;
    image(src: Buffer | Uint8Array | string, x: number, y: number, options?: ImageOptions): this;
    font(name: string): this;
    fontSize(size: number): this;
    text(text: string, x?: number, y?: number, options?: TextOptions): this;
  }

  export default PDFDocument;
}
