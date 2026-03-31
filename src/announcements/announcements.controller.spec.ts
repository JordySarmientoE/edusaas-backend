import { AnnouncementsController } from './announcements.controller';

describe('AnnouncementsController', () => {
  const announcementsService = {
    createAnnouncement: jest.fn(),
    findByClass: jest.fn(),
    findByStudent: jest.fn(),
    findByParent: jest.fn(),
    getComments: jest.fn(),
    createComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
    updateAnnouncement: jest.fn(),
    deleteAnnouncement: jest.fn()
  };

  let controller: AnnouncementsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AnnouncementsController(announcementsService as never);
  });

  it('delegates announcement creation', async () => {
    const dto = { classId: 'class-1' } as never;
    const files = [{ originalname: 'a.txt', buffer: Buffer.from('a') }];
    announcementsService.createAnnouncement.mockResolvedValue({ id: 'announcement-1' });

    const result = await controller.createAnnouncement(dto, { schoolId: 'school-1' }, { sub: 'teacher-1' } as never, files);

    expect(announcementsService.createAnnouncement).toHaveBeenCalledWith(dto, 'school-1', 'teacher-1', files);
    expect(result).toEqual({ id: 'announcement-1' });
  });

  it('delegates listing and comment actions', async () => {
    const filters = { page: 1 } as never;
    await controller.findByClass('class-1', filters, { schoolId: 'school-1' });
    await controller.getMyAnnouncements({ sub: 'student-1' } as never, { schoolId: 'school-1' });
    await controller.getChildrenAnnouncements({ sub: 'parent-1' } as never, { schoolId: 'school-1' });
    await controller.getComments('announcement-1', { sub: 'user-1' } as never, { schoolId: 'school-1' });
    await controller.createComment('announcement-1', { message: 'hola' } as never, { sub: 'user-1' } as never, {
      schoolId: 'school-1'
    });
    await controller.updateComment('comment-1', { message: 'editado' } as never, { sub: 'user-1' } as never, {
      schoolId: 'school-1'
    });

    expect(announcementsService.findByClass).toHaveBeenCalledWith('class-1', 'school-1', filters);
    expect(announcementsService.findByStudent).toHaveBeenCalledWith('student-1', 'school-1');
    expect(announcementsService.findByParent).toHaveBeenCalledWith('parent-1', 'school-1');
    expect(announcementsService.getComments).toHaveBeenCalledWith('announcement-1', 'user-1', 'school-1');
    expect(announcementsService.createComment).toHaveBeenCalledWith(
      'announcement-1',
      { message: 'hola' },
      'user-1',
      'school-1'
    );
    expect(announcementsService.updateComment).toHaveBeenCalledWith(
      'comment-1',
      { message: 'editado' },
      'user-1',
      'school-1'
    );
  });

  it('returns success messages for delete operations', async () => {
    const deleteCommentResult = await controller.deleteComment('comment-1', { sub: 'user-1' } as never, {
      schoolId: 'school-1'
    });
    const deleteAnnouncementResult = await controller.deleteAnnouncement('announcement-1', { schoolId: 'school-1' });

    expect(announcementsService.deleteComment).toHaveBeenCalledWith('comment-1', 'user-1', 'school-1');
    expect(announcementsService.deleteAnnouncement).toHaveBeenCalledWith('announcement-1', 'school-1');
    expect(deleteCommentResult).toEqual({ message: 'Comentario eliminado correctamente' });
    expect(deleteAnnouncementResult).toEqual({ message: 'Aviso eliminado correctamente' });
  });

  it('delegates announcement update with default files array', async () => {
    const dto = { title: 'Nuevo' } as never;
    await controller.updateAnnouncement('announcement-1', dto, { schoolId: 'school-1' });

    expect(announcementsService.updateAnnouncement).toHaveBeenCalledWith('announcement-1', dto, 'school-1', []);
  });
});
