import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import env from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createDatabaseBackup({
  outputDir = path.resolve(__dirname, '../backups'),
} = {}) {
  const isInternalConnect = mongoose.connection.readyState === 0;
  if (isInternalConnect) {
    await mongoose.connect(env.MONGODB_URI);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const backupData = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    collections: {},
  };

  for (const col of collections) {
    const name = col.name;
    // Skip internal system collections
    if (name.startsWith('system.')) continue;
    const documents = await db.collection(name).find({}).toArray();
    backupData.collections[name] = documents;
  }

  const jsonString = JSON.stringify(backupData, null, 2);
  const hash = crypto.createHash('sha256').update(jsonString).digest('hex');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `backup-${timestamp}.json`;
  const manifestFilename = `backup-${timestamp}.manifest.json`;

  const backupPath = path.join(outputDir, backupFilename);
  const manifestPath = path.join(outputDir, manifestFilename);

  fs.writeFileSync(backupPath, jsonString, 'utf-8');
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        filename: backupFilename,
        sha256: hash,
        createdAt: backupData.createdAt,
        collectionCounts: Object.fromEntries(
          Object.entries(backupData.collections).map(([k, v]) => [k, v.length])
        ),
      },
      null,
      2
    ),
    'utf-8'
  );

  if (isInternalConnect) {
    await mongoose.disconnect();
  }

  return {
    backupPath,
    manifestPath,
    hash,
    collectionCounts: Object.fromEntries(
      Object.entries(backupData.collections).map(([k, v]) => [k, v.length])
    ),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createDatabaseBackup()
    .then((result) => {
      console.log('Database backup created successfully:');
      console.log(`Backup file: ${result.backupPath}`);
      console.log(`SHA-256 Checksum: ${result.hash}`);
      console.log('Collection counts:', result.collectionCounts);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Backup failed:', err);
      process.exit(1);
    });
}
