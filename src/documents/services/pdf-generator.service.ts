import { Injectable } from '@nestjs/common';

@Injectable()
export class PdfGeneratorService {
  renderTemplate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, token: string) => {
      const value = this.resolvePath(context, token.trim());
      if (value === undefined || value === null) {
        return '';
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return `${value}`;
      }

      return '';
    });
  }

  generateFromHtml(html: string): Buffer {
    const plainText = this.normalizeText(html);
    const content = this.buildPdfContent(plainText);

    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
      `4 0 obj << /Length ${Buffer.byteLength(content, 'utf8')} >> stream\n${content}\nendstream endobj`,
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj'
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${object}\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';

    for (let index = 1; index < offsets.length; index += 1) {
      pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }

  private buildPdfContent(text: string): string {
    const lines = text.split('\n').filter(Boolean);
    const escapedLines = lines.map((line) => this.escapePdfText(line));
    const commands = ['BT', '/F1 12 Tf', '50 790 Td'];

    escapedLines.forEach((line, index) => {
      if (index === 0) {
        commands.push(`(${line}) Tj`);
      } else {
        commands.push(`0 -18 Td (${line}) Tj`);
      }
    });

    commands.push('ET');
    return commands.join('\n');
  }

  private normalizeText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<\/(p|div|h1|h2|h3|li|tr)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private escapePdfText(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private resolvePath(source: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, source);
  }
}
