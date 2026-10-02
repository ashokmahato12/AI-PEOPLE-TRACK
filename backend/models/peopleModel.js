const sessions = new Map();
const events = [];
const recentCrossings = new Map();
const CROSSING_COOLDOWN_MS = 8000;
let nextSessionId = 1;
let nextEventId = 1;

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatEventTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${dateKey(date)} ${hours}:${minutes}:${seconds}`;
}

function eventsSince(start) {
  return events.filter((event) => event.eventTime >= start);
}

export async function createSession(cameraName) {
  const id = nextSessionId++;
  sessions.set(id, { id, cameraName, startedAt: new Date(), endedAt: null });
  return id;
}

export async function closeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.endedAt) return 0;
  session.endedAt = new Date();
  return 1;
}

export async function switchSessionCamera(sessionId, cameraName) {
  const session = sessions.get(sessionId);
  if (!session || session.endedAt) return false;
  session.cameraName = cameraName;
  return true;
}

export async function addEvent(sessionId, trackingId, eventType) {
  if (!sessions.has(sessionId)) {
    const error = new Error('Tracking session was not found.');
    error.code = 'ER_NO_REFERENCED_ROW_2';
    throw error;
  }
  const crossingKey = `${sessionId}:${trackingId}:${eventType}`;
  const now = new Date();
  const lastCrossing = recentCrossings.get(crossingKey);
  if (lastCrossing && now - lastCrossing < CROSSING_COOLDOWN_MS) {
    return { eventId: null, duplicate: true };
  }
  const id = nextEventId++;
  events.push({ id, sessionId, trackingId, eventType, eventTime: now, cameraName: sessions.get(sessionId).cameraName });
  recentCrossings.set(crossingKey, now);
  return { eventId: id, duplicate: false };
}

export async function getTodaySummary() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todayEvents = eventsSince(start);
  return {
    entries: todayEvents.filter((event) => event.eventType === 'ENTRY').length,
    exits: todayEvents.filter((event) => event.eventType === 'EXIT').length
  };
}

export async function getAnalytics(days) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const recentEvents = eventsSince(start);
  const dailyGroups = new Map();
  const hourlyGroups = new Map();

  for (const event of recentEvents) {
    const day = dateKey(event.eventTime);
    const hour = event.eventTime.getHours();
    if (!dailyGroups.has(day)) dailyGroups.set(day, { day, entries: 0, exits: 0 });
    if (!hourlyGroups.has(hour)) hourlyGroups.set(hour, { hour, entries: 0, exits: 0 });
    const daily = dailyGroups.get(day);
    const hourly = hourlyGroups.get(hour);
    if (event.eventType === 'ENTRY') {
      daily.entries++;
      hourly.entries++;
    } else {
      daily.exits++;
      hourly.exits++;
    }
  }

  const daily = [...dailyGroups.values()].sort((left, right) => left.day.localeCompare(right.day));
  const hourly = [...hourlyGroups.values()].sort((left, right) => left.hour - right.hour);
  const peak = hourly.reduce((best, row) =>
    row.entries > (best?.entries || 0) ? row : best, null);

  return {
    daily,
    hourly,
    totals: {
      totalEvents: recentEvents.length,
      totalVisitors: recentEvents.filter((event) => event.eventType === 'ENTRY').length,
      totalExits: recentEvents.filter((event) => event.eventType === 'EXIT').length
    },
    peakHour: peak ? peak.hour : null
  };
}

export async function getHistory({ from, to, type, limit }) {
  return events
    .filter((event) => {
      const day = dateKey(event.eventTime);
      return (!from || day >= from) && (!to || day <= to) &&
        (!['ENTRY', 'EXIT'].includes(type) || event.eventType === type);
    })
    .sort((left, right) => right.eventTime - left.eventTime || right.id - left.id)
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      trackingId: event.trackingId,
      eventType: event.eventType,
      eventTime: formatEventTime(event.eventTime),
      cameraName: event.cameraName,
      sessionId: event.sessionId
    }));
}