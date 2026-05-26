const db = require('../db');
const fs = require('fs');
const path = require('path');

async function resetDatabase() {
    try {
        console.log('Reading database.sql...');
        const sqlPath = path.join(__dirname, '../database.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // Split by semicolon, but be careful with inline content (simple splitting is fine here as there are no triggers/routines)
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        console.log(`Executing ${statements.length} SQL statements...`);
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`Executing statement ${i + 1}/${statements.length}...`);
            await db.query(statement);
        }

        console.log('Database reset successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error resetting database:', err);
        process.exit(1);
    }
}

resetDatabase();
