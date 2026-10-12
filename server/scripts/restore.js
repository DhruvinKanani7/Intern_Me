import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import env from '../config/env.js';

export async function restoreDatabase({ backupPath, dryRun = false } = {}) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file does not exist: ${backupPath}`);
  }

  const raw = fs.readFileSync(backupPath, 'utf-8');
  const computedHash = crypto.createHash('sha256').update(raw).digest('hex');

  // Verify against manifest if it exists alongside backup file
  const manifestPath = backupPath.replace(/\.json$/, '.manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (manifest.sha256 && manifest.sha256 !== computedHash) {
      throw new Error(
        `Integrity checksum mismatch! Manifest: ${manifest.sha256}, Actual: ${computedHash}`
      );
    }
  }

  const data = JSON.parse(raw);
  if (!data.collections || typeof data.collections !== 'object') {
    throw new Error('Invalid backup file structure: missing collections object');
  }

  const isInternalConnect = mongoose.connection.readyState === 0;
  if (isInternalConnect) {
    await mongoose.connect(env.MONGODB_URI);
  }

  const db = mongoose.connection.db;
  const restoredCounts = {};

  if (!dryRun) {
    for (const [colName, docs] of Object.entries(data.collections)) {
      if (!Array.isArray(docs)) continue;
      const col = db.collection(colName);
      await col.deleteMany({});
      if (docs.length > 0) {
        await col.insertMany(docs);
      }
      restoredCounts[colName] = docs.length;
    }
  } else {
    for (const [colName, docs] of Object.entries(data.collections)) {
      restoredCounts[colName] = docs.length;
    }
  }

  if (isInternalConnect) {
    await mongoose.disconnect();
  }

  return {
    dryRun,
    verifiedHash: computedHash,
    restoredCounts,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fileArg = process.argv[2];
  const isDryRun = process.argv.includes('--dry-run');

  if (!fileArg) {
    console.error('Usage: node server/scripts/restore.js <path-to-backup.json> [--dry-run]');
    process.exit(1);
  }

  restoreDatabase({ backupPath: path.resolve(fileArg), dryRun: isDryRun })
    .then((result) => {
      console.log('Database restore completed:');
      console.log(`Dry run: ${result.dryRun}`);
      console.log(`Integrity Checksum: ${result.verifiedHash}`);
      console.log('Restored counts:', result.restoredCounts);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Restore failed:', err);
      process.exit(1);
    });
}
