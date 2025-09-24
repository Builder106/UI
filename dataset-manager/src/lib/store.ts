import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

export type ConsentStatus = {
  sentAt?: string;
  consent?: { granted: boolean; evidence?: string; timestamp?: string };
  downloaded?: { shots?: number; at?: string };
};

export type StatusStore = Record<string, ConsentStatus>;

export function getStatusFilePath(projectRoot: string): string {
  const dir = path.join(projectRoot, 'datasets', 'sources', 'dribbble', 'pilot');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, 'status.json');
}

export function readStatusStore(projectRoot: string): StatusStore {
  const file = getStatusFilePath(projectRoot);
  if (!existsSync(file)) {
    writeFileSync(file, '{}', 'utf8');
    return {};
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as StatusStore;
  } catch {
    return {};
  }
}

export function writeStatusStore(projectRoot: string, store: StatusStore): void {
  const file = getStatusFilePath(projectRoot);
  writeFileSync(file, JSON.stringify(store, null, 2), 'utf8');
}


