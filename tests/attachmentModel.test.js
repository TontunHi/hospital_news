jest.mock('../db', () => ({
    query: jest.fn(),
}));

const db = require('../db');
const AttachmentModel = require('../models/attachmentModel');

describe('AttachmentModel', () => {
    afterEach(() => jest.clearAllMocks());

    describe('addAttachments', () => {
        test('should insert attachments using batch query', async () => {
            db.query.mockResolvedValue([{ affectedRows: 2 }]);
            const files = [
                [1, 'uploads/img.jpg', 'image', 'photo.jpg'],
                [1, 'uploads/doc.pdf', 'pdf', 'document.pdf'],
            ];

            await AttachmentModel.addAttachments(files);
            expect(db.query).toHaveBeenCalledWith(
                'INSERT INTO attachments (news_id, file_path, file_type, original_name) VALUES ?',
                [files]
            );
        });

        test('should do nothing when files array is empty', async () => {
            await AttachmentModel.addAttachments([]);
            expect(db.query).not.toHaveBeenCalled();
        });

        test('should do nothing when files is null', async () => {
            await AttachmentModel.addAttachments(null);
            expect(db.query).not.toHaveBeenCalled();
        });

        test('should use provided connection for transactions', async () => {
            const mockConn = { query: jest.fn().mockResolvedValue([{ affectedRows: 1 }]) };
            const files = [[1, 'uploads/img.jpg', 'image', 'photo.jpg']];

            await AttachmentModel.addAttachments(files, mockConn);
            expect(mockConn.query).toHaveBeenCalled();
            expect(db.query).not.toHaveBeenCalled();
        });
    });

    describe('getByNewsId', () => {
        test('should return attachments for a news item', async () => {
            const mockFiles = [{ id: 1, file_path: 'uploads/img.jpg' }];
            db.query.mockResolvedValue([mockFiles]);

            const result = await AttachmentModel.getByNewsId(1);
            expect(result).toEqual(mockFiles);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM attachments WHERE news_id = ?', [1]);
        });
    });

    describe('getByIds', () => {
        test('should return files matching the given ids', async () => {
            const mockFiles = [{ id: 1 }, { id: 2 }];
            db.query.mockResolvedValue([mockFiles]);

            const result = await AttachmentModel.getByIds([1, 2]);
            expect(result).toEqual(mockFiles);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM attachments WHERE id IN (?)', [[1, 2]]);
        });

        test('should return empty array when ids is null', async () => {
            const result = await AttachmentModel.getByIds(null);
            expect(result).toEqual([]);
            expect(db.query).not.toHaveBeenCalled();
        });

        test('should return empty array when ids is empty', async () => {
            const result = await AttachmentModel.getByIds([]);
            expect(result).toEqual([]);
            expect(db.query).not.toHaveBeenCalled();
        });

        test('should wrap single id into an array', async () => {
            db.query.mockResolvedValue([[{ id: 5 }]]);
            const result = await AttachmentModel.getByIds(5);
            expect(result).toEqual([{ id: 5 }]);
            expect(db.query).toHaveBeenCalledWith('SELECT * FROM attachments WHERE id IN (?)', [[5]]);
        });
    });

    describe('deleteByIds', () => {
        test('should delete attachments by ids', async () => {
            db.query.mockResolvedValue([{ affectedRows: 2 }]);
            await AttachmentModel.deleteByIds([1, 2]);
            expect(db.query).toHaveBeenCalledWith('DELETE FROM attachments WHERE id IN (?)', [[1, 2]]);
        });

        test('should do nothing when ids is null', async () => {
            await AttachmentModel.deleteByIds(null);
            expect(db.query).not.toHaveBeenCalled();
        });

        test('should do nothing when ids is empty', async () => {
            await AttachmentModel.deleteByIds([]);
            expect(db.query).not.toHaveBeenCalled();
        });
    });

    describe('deleteByNewsId', () => {
        test('should delete all attachments for a news item', async () => {
            db.query.mockResolvedValue([{ affectedRows: 3 }]);
            await AttachmentModel.deleteByNewsId(1);
            expect(db.query).toHaveBeenCalledWith('DELETE FROM attachments WHERE news_id = ?', [1]);
        });
    });
});
