import * as peopleModel from '../models/peopleModel.js';

const MIN_CROSSING_CONFIDENCE = 0.8;

function trackingError(res, error) {
  console.error('Tracking request failed:', error.message);
  return res.status(500).json({ message: 'Unable to process tracking data.' });
}

export async function startSession(req, res) {
  const cameraName = typeof req.body?.cameraName === 'string'
    ? req.body.cameraName.trim().slice(0, 100)
    : '';
  if (!cameraName) return res.status(400).json({ message: 'A camera/session name is required.' });
  try {
    const sessionId = await peopleModel.createSession(cameraName);
    return res.status(201).json({ sessionId });
  } catch (error) {
    return trackingError(res, error);
  }
}

export async function stopSession(req, res) {
  const sessionId = Number(req.params.sessionId);
  if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }
  try {
    await peopleModel.closeSession(sessionId);
    return res.json({ success: true });
  } catch (error) {
    return trackingError(res, error);
  }
}

export async function switchSessionCamera(req, res) {
  const sessionId = Number(req.params.sessionId);
  const cameraName = typeof req.body?.cameraName === 'string'
    ? req.body.cameraName.trim().slice(0, 100)
    : '';
  if (!Number.isSafeInteger(sessionId) || sessionId < 1 || !cameraName) {
    return res.status(400).json({ message: 'A valid session ID and camera name are required.' });
  }
  try {
    const switched = await peopleModel.switchSessionCamera(sessionId, cameraName);
    if (!switched) return res.status(404).json({ message: 'Active tracking session was not found.' });
    return res.json({ success: true, cameraName });
  } catch (error) {
    return trackingError(res, error);
  }
}

export async function recordEvent(req, res) {
  const { sessionId, trackingId, eventType, confidence } = req.body || {};
  if (!Number.isSafeInteger(Number(sessionId)) || Number(sessionId) < 1 ||
      typeof trackingId !== 'string' || trackingId.length > 40 ||
      !['ENTRY', 'EXIT'].includes(eventType) ||
      typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < MIN_CROSSING_CONFIDENCE || confidence > 1) {
    return res.status(400).json({ message: 'A valid session, tracking ID, event type, and crossing confidence of at least 0.8 are required.' });
  }
  try {
    const result = await peopleModel.addEvent(Number(sessionId), trackingId, eventType);
    return res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({ message: 'Tracking session was not found.' });
    }
    return trackingError(res, error);
  }
}

export async function todaySummary(_req, res) {
  try {
    return res.json(await peopleModel.getTodaySummary());
  } catch (error) {
    return trackingError(res, error);
  }
}

export async function analytics(req, res) {
  const days = Math.min(90, Math.max(1, Number.parseInt(req.query.days, 10) || 7));
  try {
    return res.json(await peopleModel.getAnalytics(days));
  } catch (error) {
    return trackingError(res, error);
  }
}

export async function history(req, res) {
  const { from, to, type } = req.query;
  const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  if ((from && !validDate(from)) || (to && !validDate(to))) {
    return res.status(400).json({ message: 'Dates must use YYYY-MM-DD format.' });
  }
  try {
    const events = await peopleModel.getHistory({ from, to, type, limit: 500 });
    return res.json({ events });
  } catch (error) {
    return databaseError(res, error);
  }
}