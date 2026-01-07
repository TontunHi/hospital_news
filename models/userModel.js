const db = require('../db');

exports.findByUsername = async (username) => {
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    return users[0];
};
