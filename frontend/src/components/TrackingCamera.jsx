import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CircleStop, LoaderCircle, ScanLine } from 'lucide-react';
import { api } from '../services/api.js';
import { detectPeople, loadPersonModel } from '../services/detection.js';
import { PeopleTracker } from '../services/tracker.js';

function getSettings() {
  try {
    return JSON.parse(localStorage.getItem('people-track-settings') || '{}');
  } catch {
    return {};
  }
}

export default function TrackingCamera({ onMetrics, onEventRecorded, compact = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const modelRef = useRef(null);
  const trackerRef = useRef(new PeopleTracker());
  const sessionRef = useRef(null);
  const runningRef = useRef(false);
  const frameRef = useRef(null);
  const lastInferenceRef = useRef(0);
  const [status, setStatus] = useState('stopped');
  const [message, setMessage] = useState('Camera is off');
  const [error, setError] = useState('');
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [activeCameraName, setActiveCameraName] = useState('');
  const [switchingCamera, setSwitchingCamera] = useState(false);

  const refreshCameraDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'videoinput');
      const activeDeviceId = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId;
      setCameraDevices(devices);
      setSelectedDeviceId((current) => {
        if (devices.some((device) => device.deviceId === current)) return current;
        if (devices.some((device) => device.deviceId === activeDeviceId)) return activeDeviceId;
        return devices[0]?.deviceId || '';
      });
      return devices;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const refresh = () => { void refreshCameraDevices(); };
    refresh();
    navigator.mediaDevices?.addEventListener?.('devicechange', refresh);
    return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refresh);
  }, []);

  const stopCamera = useCallback(async () => {
    runningRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const sessionId = sessionRef.current;
    sessionRef.current = null;
    if (sessionId) {
      try {
        await api.stopSession(sessionId);
      } catch (stopError) {
        setError(stopError.message);
      }
    }
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    trackerRef.current.reset();
    onMetrics({ current: 0, active: 0, status: 'stopped' });
    setStatus('stopped');
    setMessage('Camera is off');
  }, [onMetrics]);

  const switchCamera = async (deviceId) => {
    if (deviceId === selectedDeviceId) return;
    if (status !== 'live') {
      setSelectedDeviceId(deviceId);
      return;
    }

    const previousStream = streamRef.current;
    const video = videoRef.current;
    let nextStream;
    setSwitchingCamera(true);
    setError('');
    setMessage('Switching camera...');
    try {
      nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }),
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      if (!video) throw new Error('The camera preview is not available.');
      video.srcObject = nextStream;
      await video.play();

      const cameraName = cameraDevices.find((device) => device.deviceId === deviceId)?.label ||
        getSettings().cameraName || 'Webcam';
      if (sessionRef.current) {
        await api.switchSessionCamera(sessionRef.current, cameraName);
      }

      streamRef.current = nextStream;
      previousStream?.getTracks().forEach((track) => track.stop());
      setSelectedDeviceId(deviceId);
      setActiveCameraName(cameraName);
      trackerRef.current.reset();
      lastInferenceRef.current = 0;
      onMetrics({ current: 0, active: 0, status: 'live' });
      setMessage('Detecting people in this browser');
    } catch (switchError) {
      nextStream?.getTracks().forEach((track) => track.stop());
      if (video && previousStream) {
        video.srcObject = previousStream;
        await video.play().catch(() => {});
      }
      setError(`Could not switch camera: ${switchError.message}`);
      setMessage('Detecting people in this browser');
    } finally {
      setSwitchingCamera(false);
    }
  };

  const startCamera = async () => {
    setError('');
    setStatus('loading');
    setMessage('Requesting camera access...');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access requires HTTPS or localhost and a supported browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: 'user' }),
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const devices = await refreshCameraDevices();
      const activeDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId || selectedDeviceId;
      const activeDevice = devices.find((device) => device.deviceId === activeDeviceId);
      const cameraName = activeDevice?.label || getSettings().cameraName || 'Webcam';
      setSelectedDeviceId(activeDeviceId || '');
      setActiveCameraName(cameraName);
      setMessage('Loading local person detection model...');
      modelRef.current = await loadPersonModel();
      const settings = getSettings();
      const { sessionId } = await api.startSession(cameraName || settings.cameraName || 'Webcam');
      sessionRef.current = sessionId;
      trackerRef.current.reset();
      runningRef.current = true;
      setStatus('live');
      setMessage('Detecting people in this browser');
    } catch (startError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      const denied = startError.name === 'NotAllowedError' || startError.name === 'SecurityError';
      const missingDevice = startError.name === 'NotFoundError' || startError.name === 'DevicesNotFoundError';
      const detail = denied
        ? 'Camera permission was denied. Allow camera access in your browser address-bar settings, then try again.'
        : missingDevice
          ? 'No camera was found. Connect a webcam and try again.'
          : startError.message || 'Could not start the camera.';
      setError(detail);
      setStatus('stopped');
      setMessage('Camera is off');
      onMetrics({ current: 0, active: 0, status: 'stopped' });
    }
  };

  useEffect(() => {
    if (status !== 'live') return undefined;
    let cancelled = false;
    const detectFrame = async (timestamp) => {
      if (cancelled || !runningRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || timestamp - lastInferenceRef.current < 220) {
        frameRef.current = requestAnimationFrame(detectFrame);
        return;
      }
      lastInferenceRef.current = timestamp;
      try {
        const detections = await detectPeople(modelRef.current, video);
        if (cancelled) return;
        const canvas = canvasRef.current;
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!canvas || !width || !height) return;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        const settings = getSettings();
        const linePosition = Math.min(0.8, Math.max(0.2, Number(settings.linePosition) || 0.62));
        const result = trackerRef.current.update(detections, width, height, linePosition);
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, width, height);
        context.strokeStyle = '#f4b544';
        context.lineWidth = Math.max(2, width / 500);
        context.setLineDash([12, 8]);
        context.beginPath();
        context.moveTo(0, height * linePosition);
        context.lineTo(width, height * linePosition);
        context.stroke();
        context.setLineDash([]);
        for (const person of result.people) {
          context.strokeStyle = '#53dbba';
          context.lineWidth = Math.max(2, width / 500);
          context.strokeRect(person.x, person.y, person.width, person.height);
          context.font = `600 ${Math.max(14, width / 65)}px sans-serif`;
          const labelWidth = context.measureText(person.trackingId).width + 14;
          context.fillStyle = '#53dbba';
          context.fillRect(person.x, Math.max(0, person.y - 28), labelWidth, 26);
          context.fillStyle = '#102b29';
          context.fillText(person.trackingId, person.x + 7, Math.max(19, person.y - 9));
        }
        onMetrics({ current: result.people.length, active: result.activeCount, status: 'live' });
        for (const event of result.events) {
          api.recordEvent({
            sessionId: sessionRef.current,
            trackingId: event.trackingId,
            eventType: event.eventType,
            confidence: event.confidence
          }).then((saved) => {
            if (!saved.duplicate) onEventRecorded(event.eventType, saved.eventId);
          })
            .catch((eventError) => setError(`Could not save ${event.eventType.toLowerCase()} event: ${eventError.message}`));
        }
      } catch (detectionError) {
        setError(`Detection paused: ${detectionError.message}`);
      } finally {
        if (!cancelled && runningRef.current) {
          frameRef.current = requestAnimationFrame(detectFrame);
        }
      }
    };
    frameRef.current = requestAnimationFrame(detectFrame);
    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [status, onMetrics, onEventRecorded]);

  useEffect(() => () => {
    runningRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (sessionRef.current) void api.stopSession(sessionRef.current);
  }, []);

  return (
    <section className={`camera-panel ${compact ? 'camera-compact' : ''}`}>
      <header className="camera-panel-head">
        <div>
          <span className="eyebrow">LIVE CAMERA</span>
          <h2>{activeCameraName || getSettings().cameraName || 'Webcam'}</h2>
        </div>
        <span className={`status-pill ${status === 'live' ? 'is-live' : ''}`}>
          <i />{status === 'live' ? 'Live' : status === 'loading' ? 'Starting' : 'Offline'}
        </span>
      </header>
      <div className="camera-stage">
        <video ref={videoRef} autoPlay muted playsInline aria-label="Live webcam feed" />
        <canvas ref={canvasRef} aria-hidden="true" />
        {status !== 'live' && (
          <div className="camera-placeholder">
            {status === 'loading' ? <LoaderCircle className="spin" size={28} /> : <CameraOff size={30} />}
            <span>{status === 'loading' ? message : 'Camera feed will appear here'}</span>
          </div>
        )}
        {status === 'live' && <span className="frame-tag"><ScanLine size={14} /> MODEL ACTIVE</span>}
      </div>
      <div className="camera-controls">
        <span className="camera-message">{message}</span>
        <label className="camera-device-picker">
          <span className="sr-only">Camera input</span>
          <select
            aria-label="Select camera"
            value={selectedDeviceId}
            onChange={(event) => { void switchCamera(event.target.value); }}
            disabled={status === 'loading' || switchingCamera}
          >
            <option value="">Default camera</option>
            {cameraDevices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
        {status === 'live' ? (
          <button className="button button-danger" onClick={stopCamera} disabled={switchingCamera}><CircleStop size={16} />Stop camera</button>
        ) : (
          <button className="button button-primary" onClick={startCamera} disabled={status === 'loading'}>
            <Camera size={16} />{status === 'loading' ? 'Starting...' : 'Start camera'}
          </button>
        )}
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
    </section>
  );
}