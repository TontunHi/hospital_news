const mysql = require('mysql2/promise');
require('dotenv').config();

async function diagnose() {
    // Test 1: With charset option only
    console.log('--- Test 1: charset option ---');
    const conn1 = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        charset: 'utf8mb4'
    });
    const [v1] = await conn1.query("SHOW VARIABLES LIKE 'character_set_connection'");
    console.log('  character_set_connection:', v1[0].Value);
    const [v1c] = await conn1.query("SHOW VARIABLES LIKE 'character_set_client'");
    console.log('  character_set_client:', v1c[0].Value);
    await conn1.end();

    // Test 2: With explicit SET NAMES
    console.log('--- Test 2: SET NAMES utf8mb4 ---');
    const conn2 = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });
    await conn2.query("SET NAMES utf8mb4");
    const [v2] = await conn2.query("SHOW VARIABLES LIKE 'character_set_connection'");
    console.log('  character_set_connection:', v2[0].Value);

    const testTitle = 'ทดสอบภาษาไทย';
    const testSlug = 'test-setnames-' + Date.now();
    await conn2.query('INSERT INTO news (title, slug, category, start_date, end_date) VALUES (?, ?, ?, NOW(), NOW())', [testTitle, testSlug, 'ทดสอบ']);
    const [rows] = await conn2.query('SELECT title FROM news WHERE slug = ?', [testSlug]);
    console.log('  Input:  ', testTitle);
    console.log('  Output: ', rows[0].title);
    console.log('  Match:  ', rows[0].title === testTitle ? '✅ PASS' : '❌ FAIL');
    await conn2.query('DELETE FROM news WHERE slug = ?', [testSlug]);
    await conn2.end();

    // Test 3: With charsetNumber
    console.log('--- Test 3: charsetNumber 45 (utf8mb4_general_ci) ---');
    const conn3 = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        charsetNumber: 45
    });
    const [v3] = await conn3.query("SHOW VARIABLES LIKE 'character_set_connection'");
    console.log('  character_set_connection:', v3[0].Value);
    
    const testSlug3 = 'test-charsetnum-' + Date.now();
    await conn3.query('INSERT INTO news (title, slug, category, start_date, end_date) VALUES (?, ?, ?, NOW(), NOW())', [testTitle, testSlug3, 'ทดสอบ']);
    const [rows3] = await conn3.query('SELECT title FROM news WHERE slug = ?', [testSlug3]);
    console.log('  Input:  ', testTitle);
    console.log('  Output: ', rows3[0].title);
    console.log('  Match:  ', rows3[0].title === testTitle ? '✅ PASS' : '❌ FAIL');
    await conn3.query('DELETE FROM news WHERE slug = ?', [testSlug3]);
    await conn3.end();

    process.exit();
}

diagnose().catch(e => { console.error(e); process.exit(1); });
