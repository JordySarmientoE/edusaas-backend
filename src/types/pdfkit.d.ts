declare module 'pdfkit' {
  const PDFDocument: new (...args: unknown[]) => {
    [key: string]: unknown;
  };
  export default PDFDocument;
}
