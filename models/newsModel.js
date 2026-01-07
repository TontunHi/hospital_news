const db = require('../db');

exports.getAllNews = async () => {
    const [rows] = await db.query('SELECT * FROM news ORDER BY start_date DESC');
    return rows;
};

exports.getNewsById = async (id) => {
    const [rows] = await db.query('SELECT * FROM news WHERE id = ?', [id]);
    return rows[0];
};

exports.createNews = async (data) => {
    const { title, slug, category, youtube_link, start_date, end_date } = data;
    const [result] = await db.query(
        'INSERT INTO news (title, slug, category, youtube_link, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
        [title, slug, category, youtube_link, start_date, end_date]
    );
    return result.insertId;
};

exports.updateNews = async (id, data) => {
    const { title, slug, category, youtube_link, start_date, end_date } = data;
    await db.query(
        'UPDATE news SET title = ?, slug = ?, category = ?, youtube_link = ?, start_date = ?, end_date = ? WHERE id = ?',
        [title, slug, category, youtube_link, start_date, end_date, id]
    );
};

exports.deleteNews = async (id) => {
    await db.query('DELETE FROM news WHERE id = ?', [id]);
};

exports.incrementViewCount = async (id) => {
    await db.query('UPDATE news SET view_count = view_count + 1 WHERE id = ?', [id]);
};

exports.getPublicNews = async (category) => {
    const sql = `
        SELECT id, title, slug, category, start_date, end_date, youtube_link, view_count 
        FROM news 
        WHERE category = ? 
        AND start_date <= NOW() 
        AND end_date >= NOW()
        ORDER BY start_date DESC
    `;
    const [rows] = await db.query(sql, [category]);
    return rows;
};

exports.getArchivedNews = async () => {
    const sql = `
        SELECT id, title, slug, category, start_date, end_date, youtube_link, view_count 
        FROM news 
        WHERE end_date < NOW()
        ORDER BY end_date DESC
    `;
    const [rows] = await db.query(sql);
    return rows;
};

exports.beginTransaction = async () => {
    await db.query('START TRANSACTION');
};

exports.commit = async () => {
    await db.query('COMMIT');
};

exports.rollback = async () => {
    await db.query('ROLLBACK');
};
