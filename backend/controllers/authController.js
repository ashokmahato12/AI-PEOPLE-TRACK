import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import { createAccount, findAccountByEmail } from '../models/accountStore.js';

const environmentFile = fileURLToPath(new URL('../.env', import.meta.url));
const scrypt = promisify(scryptCallback);
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeEqual(left, right) {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash) && left === right;
}

function configuredPassword() {
  if (process.env.ADMIN_PASSWORD_HEX) {
    return Buffer.from(process.env.ADMIN_PASSWORD_HEX, 'hex').toString('utf8');
  }
  return process.env.ADMIN_PASSWORD || '';
}

async function persistPassword(password) {
  const environment = await readFile(environmentFile, 'utf8');
  const encodedPassword = Buffer.from(password, 'utf8').toString('hex');
  const lines = environment
    .split(/\r?\n/)
    .filter((line) => !/^ADMIN_PASSWORD(?:_HEX)?=/.test(line));
  lines.push(`ADMIN_PASSWORD_HEX=${encodedPassword}`);
  await writeFile(environmentFile, `${lines.filter(Boolean).join('\n')}\n`, 'utf8');
  process.env.ADMIN_PASSWORD_HEX = encodedPassword;
  delete process.env.ADMIN_PASSWORD;
}

function validNewPassword(password) {
  return typeof password === 'string' && password.length >= 4 && password.length <= 128 && !/[\r\n\0]/.test(password);
}

async function hashAccountPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return { salt, passwordHash: Buffer.from(hash).toString('hex') };
}

async function verifyAccountPassword(password, account) {
  const expected = Buffer.from(account.passwordHash, 'hex');
  const actual = Buffer.from(await scrypt(password, account.salt, expected.length));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function issueToken(res, email, status = 200) {
  const token = jwt.sign({ email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
  return res.status(status).json({ token, user: { email } });
}

export async function login(req, res) {
  const { email, password } = req.body || {};
  const configuredEmail = process.env.ADMIN_EMAIL || '';
  const passwordFromEnvironment = configuredPassword();

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Login is not configured. Check the backend environment file.' });
  }
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (configuredEmail && passwordFromEnvironment &&
      safeEqual(normalizedEmail, configuredEmail.trim().toLowerCase()) &&
      safeEqual(password, passwordFromEnvironment)) {
    return issueToken(res, configuredEmail);
  }

  try {
    const account = await findAccountByEmail(normalizedEmail);
    if (account && await verifyAccountPassword(password, account)) {
      return issueToken(res, account.email);
    }
  } catch (error) {
    console.error('Account sign-in failed:', error.message);
    return res.status(500).json({ message: 'Sign in is temporarily unavailable.' });
  }
  return res.status(401).json({ message: 'Email or password is incorrect.' });
}

export async function register(req, res) {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Registration is not configured. Check the backend environment file.' });
  }
  if (normalizedEmail.length > 254 || !validEmail.test(normalizedEmail) || !validNewPassword(password)) {
    return res.status(400).json({ message: 'Enter a valid email and a password between 4 and 128 characters.' });
  }
  const configuredEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (normalizedEmail === configuredEmail) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  try {
    const credentials = await hashAccountPassword(password);
    const created = await createAccount({
      email: normalizedEmail,
      ...credentials,
      createdAt: new Date().toISOString()
    });
    if (!created) return res.status(409).json({ message: 'An account with this email already exists.' });
    return issueToken(res, normalizedEmail, 201);
  } catch (error) {
    console.error('Account registration failed:', error.message);
    return res.status(500).json({ message: 'Could not create the account.' });
  }
}

export function currentUser(req, res) {
  return res.json({ user: { email: req.user.email } });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  const configuredEmail = process.env.ADMIN_EMAIL || '';
  const passwordFromEnvironment = configuredPassword();

  if (req.user.email !== configuredEmail) {
    return res.status(403).json({ message: 'Only the configured administrator can change this password.' });
  }
  if (typeof currentPassword !== 'string' || !validNewPassword(newPassword)) {
    return res.status(400).json({ message: 'Enter your current password and a new password between 4 and 128 characters.' });
  }
  if (!safeEqual(currentPassword, passwordFromEnvironment)) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }

  try {
    await persistPassword(newPassword);
    return res.json({ success: true });
  } catch (error) {
    console.error('Password change failed:', error.message);
    return res.status(500).json({ message: 'Could not save the new password. Check the local environment file.' });
  }
}

export async function resetPassword(req, res) {
  const { email, recoveryCode, newPassword } = req.body || {};
  const configuredEmail = process.env.ADMIN_EMAIL || '';
  const configuredRecoveryCode = process.env.ADMIN_PASSWORD_RESET_CODE || '';

  if (typeof email !== 'string' || typeof recoveryCode !== 'string' ||
      !configuredEmail || !configuredRecoveryCode ||
      !safeEqual(email.trim().toLowerCase(), configuredEmail.trim().toLowerCase()) ||
      !safeEqual(recoveryCode, configuredRecoveryCode)) {
    return res.status(401).json({ message: 'Email or recovery code is incorrect.' });
  }
  if (!validNewPassword(newPassword)) {
    return res.status(400).json({ message: 'Choose a new password between 4 and 128 characters.' });
  }

  try {
    await persistPassword(newPassword);
    return res.json({ success: true });
  } catch (error) {
    console.error('Password reset failed:', error.message);
    return res.status(500).json({ message: 'Could not save the new password. Check the local environment file.' });
  }
}