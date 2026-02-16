jest.mock('../models/newsModel');
jest.mock('../models/attachmentModel');
jest.mock('../db', () => ({
    query: jest.fn(),
    getConnection: jest.fn(),
}));

const NewsModel = require('../models/newsModel');
const AttachmentModel = require('../models/attachmentModel');
const db = require('../db');
const newsController = require('../controllers/newsController');

function mockReqRes(overrides = {}) {
    const req = {
        body: {},
        session: {},
        cookies: {},
        query: {},
        params: {},
        files: { images: [], pdf_file: [] },
        ...overrides,
    };
    const res = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
    };
    return { req, res };
}

describe('News Controller', () => {
    afterEach(() => jest.clearAllMocks());

    describe('getNewsList', () => {
        test('should render news_manage with news list', async () => {
            const mockNews = [{ id: 1 }, { id: 2 }];
            NewsModel.getAllNews.mockResolvedValue(mockNews);
            const { req, res } = mockReqRes();

            await newsController.getNewsList(req, res);
            expect(res.render).toHaveBeenCalledWith('admin/news_manage', {
                newsList: mockNews,
                message: null,
            });
        });

        test('should include success message from query param', async () => {
            NewsModel.getAllNews.mockResolvedValue([]);
            const { req, res } = mockReqRes({ query: { success: 'upload' } });

            await newsController.getNewsList(req, res);
            expect(res.render).toHaveBeenCalledWith('admin/news_manage', {
                newsList: [],
                message: 'เพิ่มข่าวสารใหม่เรียบร้อยแล้ว',
            });
        });

        test('should return 500 on error', async () => {
            NewsModel.getAllNews.mockRejectedValue(new Error('DB Error'));
            const { req, res } = mockReqRes();

            await newsController.getNewsList(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getUpload', () => {
        test('should render upload page', () => {
            const { req, res } = mockReqRes({ query: { success: true } });
            newsController.getUpload(req, res);
            expect(res.render).toHaveBeenCalledWith('admin/upload', { success: true });
        });
    });

    describe('postUpload', () => {
        test('should return 400 if required fields are missing', async () => {
            const { req, res } = mockReqRes({ body: { title: '', start_date: '', end_date: '' } });

            await newsController.postUpload(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('should create news and redirect on success', async () => {
            const mockConn = {
                beginTransaction: jest.fn(),
                commit: jest.fn(),
                rollback: jest.fn(),
                release: jest.fn(),
            };
            db.getConnection.mockResolvedValue(mockConn);
            NewsModel.createNews.mockResolvedValue(1);

            const { req, res } = mockReqRes({
                body: {
                    title: 'Test News',
                    category: 'ข่าวสาร',
                    youtube_link: '',
                    start_date: '2024-01-01T08:00',
                    end_date: '2024-12-31T08:00',
                },
            });

            await newsController.postUpload(req, res);
            expect(mockConn.beginTransaction).toHaveBeenCalled();
            expect(NewsModel.createNews).toHaveBeenCalled();
            expect(mockConn.commit).toHaveBeenCalled();
            expect(mockConn.release).toHaveBeenCalled();
            expect(res.redirect).toHaveBeenCalledWith('/admin/news?success=upload');
        });

        test('should rollback on error', async () => {
            const mockConn = {
                beginTransaction: jest.fn(),
                commit: jest.fn(),
                rollback: jest.fn(),
                release: jest.fn(),
            };
            db.getConnection.mockResolvedValue(mockConn);
            NewsModel.createNews.mockRejectedValue(new Error('Insert failed'));

            const { req, res } = mockReqRes({
                body: {
                    title: 'Test', category: 'ข่าวสาร', youtube_link: '',
                    start_date: '2024-01-01T08:00', end_date: '2024-12-31T08:00',
                },
            });

            await newsController.postUpload(req, res);
            expect(mockConn.rollback).toHaveBeenCalled();
            expect(mockConn.release).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getEdit', () => {
        test('should return 404 if news not found', async () => {
            NewsModel.getNewsById.mockResolvedValue(null);
            const { req, res } = mockReqRes({ params: { id: '999' } });

            await newsController.getEdit(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('should render edit page with news and files', async () => {
            const mockNews = {
                id: 1, title: 'Test',
                start_date: new Date('2024-01-01T08:00:00'),
                end_date: new Date('2024-12-31T08:00:00'),
            };
            const mockFiles = [{ id: 1, file_path: 'uploads/test.pdf' }];
            NewsModel.getNewsById.mockResolvedValue(mockNews);
            AttachmentModel.getByNewsId.mockResolvedValue(mockFiles);
            const { req, res } = mockReqRes({ params: { id: '1' } });

            await newsController.getEdit(req, res);
            expect(res.render).toHaveBeenCalledWith('admin/edit', {
                news: expect.objectContaining({ start_date_local: expect.any(String) }),
                files: mockFiles,
            });
        });
    });

    describe('deleteNews', () => {
        test('should delete news and redirect', async () => {
            AttachmentModel.getByNewsId.mockResolvedValue([]);
            NewsModel.deleteNews.mockResolvedValue();
            const { req, res } = mockReqRes({ params: { id: '1' } });

            await newsController.deleteNews(req, res);
            expect(NewsModel.deleteNews).toHaveBeenCalledWith('1');
            expect(res.redirect).toHaveBeenCalledWith('/admin/news?success=delete');
        });

        test('should return 500 on error', async () => {
            AttachmentModel.getByNewsId.mockRejectedValue(new Error('DB Error'));
            const { req, res } = mockReqRes({ params: { id: '1' } });

            await newsController.deleteNews(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('deleteFile', () => {
        test('should return 404 if file not found', async () => {
            AttachmentModel.getByIds.mockResolvedValue([]);
            const { req, res } = mockReqRes({ params: { id: '999' } });

            await newsController.deleteFile(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'File not found' });
        });

        test('should delete file and return success', async () => {
            AttachmentModel.getByIds.mockResolvedValue([{ id: 1, file_path: 'uploads/test.jpg' }]);
            AttachmentModel.deleteByIds.mockResolvedValue();
            const { req, res } = mockReqRes({ params: { id: '1' } });

            await newsController.deleteFile(req, res);
            expect(AttachmentModel.deleteByIds).toHaveBeenCalledWith(['1']);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        test('should return 500 on error', async () => {
            AttachmentModel.getByIds.mockRejectedValue(new Error('DB Error'));
            const { req, res } = mockReqRes({ params: { id: '1' } });

            await newsController.deleteFile(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Server error' });
        });
    });
});
