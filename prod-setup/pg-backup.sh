LOG_FILE="/var/log/pg_backup.log"
DB_NAME="billing"
BACKUP_DIR_LOCAL="/root/pg_backups"
BACKUP_DIR_REMOTE="/root/backups/billing"
BACKUP_SERVER="<IP_ADDRESS>"

CURR_DATETIME=$(date +%Y%m%d_%H%M%S)
DUMP_FILE_PATH="$BACKUP_DIR_LOCAL/$DB_NAME-$CURR_DATETIME.sql"

log_message() {
  echo "$(date "+%Y-%m-%d %H:%M:%S") - $1" >> "$LOG_FILE"
}

pg_dump "$DB_NAME" > "$DUMP_FILE_PATH"
log_message "success pg_dump"

# copy file to backups server
scp -P4444 "$DUMP_FILE_PATH" "root@$BACKUP_SERVER:$BACKUP_DIR_REMOTE"
log_message "Backup $DUMP_FILE_PATH transferred successfully"

# delete old local backups older 3 days
find "$BACKUP_DIR_LOCAL" -type f -name '*.sql' -mtime +3 -exec rm {} \;
log_message "Old files on local server successfully deleted"

# delete old remote backups older 3 days
ssh root@$BACKUP_SERVER -p 4444 find '$BACKUP_DIR_REMOTE' -type f -name '*.sql' -mtime +3 -delete
log_message "Old files on remote server successfully deleted"

# to restore we create only database ! no need to run migrations
# 1) create database
# 2) psql -d billing -f backup.sql
