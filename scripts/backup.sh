#!/bin/bash
# scripts/backup.sh
# Automated MySQL Backup with 30-day retention

# Load .env variables
if [ -f ../.env ]; then
  export $(grep -v '^#' ../.env | xargs)
fi

BACKUP_DIR="../backups/db"
DATE=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

echo "Starting backup for database: $DB_NAME"

# Dump and gzip
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $FILE

if [ $? -eq 0 ]; then
  echo "Backup successful: $FILE"
else
  echo "Backup failed!"
  exit 1
fi

# Clean up old backups (>30 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
echo "Old backups cleaned up."
