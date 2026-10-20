import fs from 'fs';
import crypto from 'crypto';

export function verifyDatabaseRestore(backupPath: string, metadataPath: string) {
  const data = fs.readFileSync(backupPath);
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const sha256 = crypto.createHash('sha256').update(data).digest('hex');
  const checksumMatched = sha256 === metadata.sha256;
  const sqliteHeaderValid = data.slice(0, 15).toString() === 'SQLite format 3';

  return {
    verified: checksumMatched && sqliteHeaderValid,
    checksumMatched,
    sqliteHeaderValid,
  };
}
