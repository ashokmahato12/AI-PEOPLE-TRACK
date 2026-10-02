import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { changePassword, currentUser, login, register, resetPassword } from '../controllers/authController.js';
import {
  analytics,
  history,
  recordEvent,
  startSession,
  stopSession,
  switchSessionCamera,
  todaySummary
} from '../controllers/peopleController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Try again in 15 minutes.' }
});
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many password changes. Try again in 15 minutes.' }
});
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many password reset attempts. Try again in 15 minutes.' }
});
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many registration attempts. Try again in 15 minutes.' }
});

router.post('/auth/login', loginLimiter, login);
router.post('/auth/register', registrationLimiter, register);
router.post('/auth/reset-password', passwordResetLimiter, resetPassword);
router.get('/auth/me', requireAuth, currentUser);
router.post('/auth/change-password', requireAuth, passwordChangeLimiter, changePassword);
router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.use(requireAuth);
router.post('/sessions', startSession);
router.patch('/sessions/:sessionId/stop', stopSession);
router.patch('/sessions/:sessionId/camera', switchSessionCamera);
router.post('/events', recordEvent);
router.get('/summary/today', todaySummary);
router.get('/analytics', analytics);
router.get('/history', history);

export default router;