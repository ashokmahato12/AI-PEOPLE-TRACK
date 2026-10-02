import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const accountsFile = fileURLToPath(new URL('../../.local-data/accounts.json', import.meta.url));
let writeQueue = Promise.resolve();

async function readAccounts() {
  try {
    return JSON.parse(await readFile(accountsFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function findAccountByEmail(email) {
  const accounts = await readAccounts();
  return accounts.find((account) => account.email === email) || null;
}

export function createAccount(account) {
  const operation = async () => {
    const accounts = await readAccounts();
    if (accounts.some((existing) => existing.email === account.email)) return false;

    accounts.push(account);
    await mkdir(dirname(accountsFile), { recursive: true });
    const temporaryFile = join(dirname(accountsFile), 'accounts.tmp');
    await writeFile(temporaryFile, JSON.stringify(accounts, null, 2), { encoding: 'utf8', mode: 0o600 });
    await rename(temporaryFile, accountsFile);
    return true;
  };

  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}
