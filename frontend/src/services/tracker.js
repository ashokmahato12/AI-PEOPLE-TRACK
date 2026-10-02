const MIN_CROSSING_CONFIDENCE = 0.8;
const CROSSING_COOLDOWN_MS = 8000;
const MIN_TRACK_DURATION_MS = 1000;
const CROSSING_STABLE_FRAMES = 4;
const LINE_HYSTERESIS = 0.07;
const BOX_SMOOTHING = 0.35;
const TRACK_TIMEOUT_MS = 1800;

function intersectionOverUnion(left, right) {
  const x1 = Math.max(left.x, right.x);
  const y1 = Math.max(left.y, right.y);
  const x2 = Math.min(left.x + left.width, right.x + right.width);
  const y2 = Math.min(left.y + left.height, right.y + right.height);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = left.width * left.height + right.width * right.height - intersection;
  return union > 0 ? intersection / union : 0;
}

function smoothBox(previous, next) {
  return {
    x: previous.x + (next.x - previous.x) * BOX_SMOOTHING,
    y: previous.y + (next.y - previous.y) * BOX_SMOOTHING,
    width: previous.width + (next.width - previous.width) * BOX_SMOOTHING,
    height: previous.height + (next.height - previous.height) * BOX_SMOOTHING
  };
}

export class PeopleTracker {
  constructor() {
    this.nextId = 1;
    this.tracks = new Map();
  }

  reset() {
    this.nextId = 1;
    this.tracks.clear();
  }

  update(detections, frameWidth, frameHeight, linePosition) {
    const now = Date.now();
    const lineY = frameHeight * linePosition;
    const candidates = [];

    for (const detection of detections) {
      const detectionBox = {
        x: detection.x,
        y: detection.y,
        width: detection.width,
        height: detection.height
      };
      const detectionCenterX = detectionBox.x + detectionBox.width / 2;
      const detectionCenterY = detectionBox.y + detectionBox.height / 2;
      let best = null;
      let bestMatchScore = Infinity;
      const maxDistance = Math.max(80, frameWidth * 0.15);

      for (const track of this.tracks.values()) {
        if (track.matched || now - track.lastSeen > TRACK_TIMEOUT_MS) continue;
        const distance = Math.hypot(
          track.associationCenterX - detectionCenterX,
          track.associationCenterY - detectionCenterY
        );
        const overlap = intersectionOverUnion(track.box, detectionBox);
        if (distance > maxDistance && overlap < 0.1) continue;
        const sizeChange = Math.abs(
          Math.log((detectionBox.width * detectionBox.height) / (track.box.width * track.box.height))
        );
        const matchScore = distance / maxDistance - overlap * 0.4 + Math.min(sizeChange, 1) * 0.1;
        if (matchScore < bestMatchScore) {
          best = track;
          bestMatchScore = matchScore;
        }
      }

      const track = best || {
        id: this.nextId++,
        box: detectionBox,
        centerX: detectionCenterX,
        centerY: detectionCenterY,
        associationCenterX: detectionCenterX,
        associationCenterY: detectionCenterY,
        firstSeen: now,
        lastSeen: now,
        stableSide: detectionBox.y + detectionBox.height / 2 >= lineY,
        candidateSide: null,
        candidateFrames: 0,
        matched: false,
        lastCrossings: { ENTRY: 0, EXIT: 0 }
      };
      if (best) track.box = smoothBox(track.box, detectionBox);
      track.associationCenterX = detectionCenterX;
      track.associationCenterY = detectionCenterY;
      const centerX = track.box.x + track.box.width / 2;
      const centerY = track.box.y + track.box.height / 2;
      track.matched = true;
      track.centerX = centerX;
      track.centerY = centerY;
      track.lastSeen = now;
      detection.x = track.box.x;
      detection.y = track.box.y;
      detection.width = track.box.width;
      detection.height = track.box.height;
      this.tracks.set(track.id, track);
      candidates.push({ detection, track, centerY });
    }

    const events = [];
    for (const { detection, track, centerY } of candidates) {
      const offset = centerY - lineY;
      const crossingBand = frameHeight * LINE_HYSTERESIS;
      const candidateSide = offset >= crossingBand
        ? true
        : offset <= -crossingBand
          ? false
          : null;

      if (candidateSide === null || candidateSide === track.stableSide) {
        track.candidateSide = null;
        track.candidateFrames = 0;
      } else {
        if (candidateSide !== track.candidateSide) {
          track.candidateSide = candidateSide;
          track.candidateFrames = 1;
        } else {
          track.candidateFrames++;
        }

        const distanceConfidence = Math.min(1, Math.abs(offset) / (frameHeight * 0.1));
        const confidence = Math.min(detection.score || 0, distanceConfidence);
        const eventType = candidateSide ? 'ENTRY' : 'EXIT';
        const mature = now - track.firstSeen >= MIN_TRACK_DURATION_MS;
        if (track.candidateFrames >= CROSSING_STABLE_FRAMES && mature && confidence >= MIN_CROSSING_CONFIDENCE) {
          if (now - track.lastCrossings[eventType] >= CROSSING_COOLDOWN_MS) {
            events.push({
              trackingId: `P-${track.id}`,
              eventType,
              confidence
            });
            track.lastCrossings[eventType] = now;
          }
          track.stableSide = candidateSide;
          track.candidateSide = null;
          track.candidateFrames = 0;
        }
      }
      detection.trackingId = `P-${track.id}`;
    }

    for (const [id, track] of this.tracks) {
      if (now - track.lastSeen > TRACK_TIMEOUT_MS) this.tracks.delete(id);
      track.matched = false;
    }

    return { people: detections, events, activeCount: candidates.length };
  }
}