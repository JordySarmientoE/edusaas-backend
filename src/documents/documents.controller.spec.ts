import { DocumentsController } from './documents.controller';

describe('DocumentsController', () => {
  const documentsService = {
    createTemplate: jest.fn(),
    getTemplates: jest.fn(),
    issueDocument: jest.fn(),
    getDocumentHistory: jest.fn()
  };

  let controller: DocumentsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DocumentsController(documentsService as never);
  });

  it('delegates template operations and history', async () => {
    await controller.createTemplate({ title: 'Constancia' } as never, { schoolId: 'school-1' });
    await controller.getTemplates({ schoolId: 'school-1' });
    await controller.getDocumentHistory('student-1', { schoolId: 'school-1' });

    expect(documentsService.createTemplate).toHaveBeenCalledWith({ title: 'Constancia' }, 'school-1');
    expect(documentsService.getTemplates).toHaveBeenCalledWith('school-1');
    expect(documentsService.getDocumentHistory).toHaveBeenCalledWith('student-1', 'school-1');
  });

  it('maps generated document payload', async () => {
    documentsService.issueDocument.mockResolvedValue({
      document: {
        id: 'doc-1',
        title: 'Constancia',
        fileUrl: '/docs/doc-1.pdf',
        documentType: 'certificate'
      }
    });

    const result = await controller.generateDocument(
      { templateId: 'tpl-1', studentId: 'student-1' } as never,
      { sub: 'admin-1' } as never,
      { schoolId: 'school-1' }
    );

    expect(documentsService.issueDocument).toHaveBeenCalledWith(
      { templateId: 'tpl-1', studentId: 'student-1' },
      'school-1',
      'admin-1'
    );
    expect(result).toEqual({
      id: 'doc-1',
      title: 'Constancia',
      fileUrl: '/docs/doc-1.pdf',
      documentType: 'certificate'
    });
  });
});
