import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export function performDatabaseBackup() {
  const dbPath = path.resolve(process.cwd(), 'db/dev.db');
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
  const metadataPath = path.join(backupDir, `backup-${timestamp}.json`);

  const data = fs.readFileSync(dbPath);
  fs.writeFileSync(backupPath, data);

  const sha256 = crypto.createHash('sha256').update(data).digest('hex');
  const metadata = { timestamp, sha256, sizeBytes: data.length };
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return { success: true, backupPath, metadataPath, sha256 };
}
