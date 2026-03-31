import { ReportsController } from './reports.controller';

describe('ReportsController', () => {
  const reportsService = {
    getAttendanceKpi: jest.fn(),
    getGradesKpi: jest.fn(),
    getPendingTasksKpi: jest.fn(),
    getDisciplineKpi: jest.fn(),
    exportToCsv: jest.fn(),
    exportToExcel: jest.fn(),
    exportGradesControlPdf: jest.fn(),
    exportStudentReportCardPdf: jest.fn(),
    exportChildReportCardPdf: jest.fn()
  };

  let controller: ReportsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReportsController(reportsService as never);
  });

  it('delegates KPI methods', async () => {
    await controller.getAttendanceKpi('cycle-1', { schoolId: 'school-1' });
    await controller.getGradesKpi('cycle-1', { schoolId: 'school-1' });
    await controller.getPendingTasksKpi({ schoolId: 'school-1' });
    await controller.getDisciplineKpi('cycle-1', { schoolId: 'school-1' });

    expect(reportsService.getAttendanceKpi).toHaveBeenCalledWith('school-1', 'cycle-1');
    expect(reportsService.getGradesKpi).toHaveBeenCalledWith('school-1', 'cycle-1');
    expect(reportsService.getPendingTasksKpi).toHaveBeenCalledWith('school-1');
    expect(reportsService.getDisciplineKpi).toHaveBeenCalledWith('school-1', 'cycle-1');
  });

  it('wraps export responses in base64 payloads', async () => {
    reportsService.exportToCsv.mockResolvedValue(Buffer.from('csv'));
    reportsService.exportToExcel.mockResolvedValue(Buffer.from('xlsx'));
    reportsService.exportGradesControlPdf.mockResolvedValue(Buffer.from('pdf'));
    reportsService.exportStudentReportCardPdf.mockResolvedValue(Buffer.from('student'));
    reportsService.exportChildReportCardPdf.mockResolvedValue(Buffer.from('child'));

    const csv = await controller.exportCsv({ entity: 'users' } as never, { schoolId: 'school-1' });
    const excel = await controller.exportExcel({ entity: 'users' } as never, { schoolId: 'school-1' });
    const gradesPdf = await controller.exportGradesControlPdf({ classId: 'class-1', cycleId: 'cycle-1' } as never, {
      schoolId: 'school-1'
    });
    const myPdf = await controller.exportMyReportCardPdf(
      { cycleId: 'cycle-1' } as never,
      { sub: 'student-1' } as never,
      { schoolId: 'school-1' }
    );
    const childPdf = await controller.exportChildReportCardPdf(
      { studentId: 'student-1', cycleId: 'cycle-1' } as never,
      { sub: 'parent-1' } as never,
      { schoolId: 'school-1' }
    );

    expect(csv).toEqual({ entity: 'users', format: 'csv', contentBase64: Buffer.from('csv').toString('base64') });
    expect(excel).toEqual({ entity: 'users', format: 'xlsx', contentBase64: Buffer.from('xlsx').toString('base64') });
    expect(gradesPdf).toEqual({
      entity: 'grades_control',
      format: 'pdf',
      contentBase64: Buffer.from('pdf').toString('base64')
    });
    expect(myPdf).toEqual({
      entity: 'student_report_card',
      format: 'pdf',
      contentBase64: Buffer.from('student').toString('base64')
    });
    expect(childPdf).toEqual({
      entity: 'child_report_card',
      format: 'pdf',
      contentBase64: Buffer.from('child').toString('base64')
    });
  });
});
