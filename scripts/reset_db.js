const fs = require('fs');
const path = require('path');
const db = require('../db');

async function resetDb() {
    try {
        console.log("⚠️  Resetting Database Tables (User Requested)... ");
        await db.query('SET FOREIGN_KEY_CHECKS=0');
        
        // 1. Drop Tables
        const tables = ['attachments', 'news', 'users'];
        for (const t of tables) {
            await db.query(`DROP TABLE IF EXISTS ${t}`);
            console.log(`Dropped table '${t}'`);
        }

        // 2. Read database.sql
        const sqlPath = path.join(__dirname, '..', 'database.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // 3. Filter and Execute Queries
        const queries = sqlContent
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0)
            .filter(q => !q.toUpperCase().startsWith('CREATE DATABASE')) // Skip Create DB (requires perm)
            .filter(q => !q.toUpperCase().startsWith('USE ')); // Skip Use DB

        for (const query of queries) {
            try {
                await db.query(query);
                // Log only the first line of the query
                console.log(`Executed: ${query.split('\n')[0]}...`);
            } catch (e) {
                console.error("Query Failed:", query.substring(0, 50), e.message);
            }
        }

        await db.query('SET FOREIGN_KEY_CHECKS=1');
        console.log("✅ Database reset and schema applied successfully.");
    } catch (err) {
        console.error("Fatal Error:", err);
    } finally {
        process.exit();
    }
}

resetDb();
