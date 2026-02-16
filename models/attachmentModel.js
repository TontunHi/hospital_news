const db = require('../db');

exports.addAttachments = async (files, connection) => {
    if (!files || files.length === 0) return;
    const dbConn = connection || db;
    await dbConn.query('INSERT INTO attachments (news_id, file_path, file_type, original_name) VALUES ?', [files]);
};

exports.getByNewsId = async (newsId) => {
    const [rows] = await db.query('SELECT * FROM attachments WHERE news_id = ?', [newsId]);
    return rows;
};

exports.getByIds = async (ids) => {
    if (!ids || ids.length === 0) return [];
    // Ensure ids is an array
    const idArray = Array.isArray(ids) ? ids : [ids];
    if (idArray.length === 0) return [];
    const [rows] = await db.query('SELECT * FROM attachments WHERE id IN (?)', [idArray]);
    return rows;
};

exports.deleteByIds = async (ids, connection) => {
    if (!ids || ids.length === 0) return;
    const idArray = Array.isArray(ids) ? ids : [ids];
    if (idArray.length === 0) return;
    const dbConn = connection || db;
    await dbConn.query('DELETE FROM attachments WHERE id IN (?)', [idArray]);
};

exports.deleteByNewsId = async (newsId) => {
    await db.query('DELETE FROM attachments WHERE news_id = ?', [newsId]);
};
