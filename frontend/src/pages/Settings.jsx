import { useEffect, useState } from 'react';
import { Check, Crosshair, KeyRound, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { api } from '../services/api.js';

const defaults = { cameraName: 'Webcam', linePosition: 0.62 };

function readSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem('people-track-settings') || '{}') };
  } catch {
    return defaults;
  }
}

export default function Settings() {
  const [settings, setSettings] = useState(readSettings);
  const [saved, setSaved] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
  }, []);

  const save = (event) => {
    event.preventDefault();
    localStorage.setItem('people-track-settings', JSON.stringify(settings));
    window.dispatchEvent(new Event('people-track-settings-updated'));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const reset = () => {
    setSettings(defaults);
    localStorage.setItem('people-track-settings', JSON.stringify(defaults));
    window.dispatchEvent(new Event('people-track-settings-updated'));
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (passwords.next.length < 4 || passwords.next.length > 128) {
      setPasswordError('Use a new password between 4 and 128 characters.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError('The new passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordMessage('Password changed successfully.');
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="page-stack settings-page">
      <div className="page-heading"><div><span className="eyebrow">CONFIGURATION / LOCAL</span><h1>Settings</h1><p>Adjust your camera session and virtual counting line.</p></div></div>
      <form className="settings-panel" onSubmit={save}>
        <div className="settings-section-heading"><span className="settings-icon"><Crosshair size={18} /></span><div><h2>Tracking setup</h2><p>These preferences stay in this browser.</p></div></div>
        <label className="setting-field"><span>Camera / session name</span><small>Added to every stored session record.</small><input maxLength="100" value={settings.cameraName} onChange={(event) => setSettings({ ...settings, cameraName: event.target.value })} required /></label>
        <label className="setting-field"><span>Counting line position <b>{Math.round(settings.linePosition * 100)}%</b></span><small>Move the horizontal line within the camera frame.</small><input className="line-slider" type="range" min="20" max="80" value={Math.round(settings.linePosition * 100)} onChange={(event) => setSettings({ ...settings, linePosition: Number(event.target.value) / 100 })} /><div className="slider-labels"><span>Top · 20%</span><span>Bottom · 80%</span></div></label>
        <div className="settings-callout"><ShieldCheck size={18} /><p>Person detection runs on-device in your browser. Video frames are not uploaded or stored.</p></div>
        <footer className="settings-actions"><button className="button button-secondary" type="button" onClick={reset}><RotateCcw size={15} />Reset defaults</button><button className="button button-primary"><Save size={15} />{saved ? <><Check size={15} />Saved</> : 'Save settings'}</button></footer>
      </form>
      <form className="settings-panel password-panel" onSubmit={changePassword}>
        <div className="settings-section-heading"><span className="settings-icon"><KeyRound size={18} /></span><div><h2>Change password</h2><p>Update the administrator password for this workspace.</p></div></div>
        <label className="setting-field"><span>Current password</span><input type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} required /></label>
        <label className="setting-field"><span>New password</span><small>Use 4 to 128 characters.</small><input type="password" autoComplete="new-password" minLength={4} maxLength={128} value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} required /></label>
        <label className="setting-field"><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength={4} maxLength={128} value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} required /></label>
        {passwordError && <p className="inline-error" role="alert">{passwordError}</p>}
        {passwordMessage && <p className="inline-success" role="status">{passwordMessage}</p>}
        <footer className="settings-actions"><button className="button button-primary" disabled={changingPassword}><KeyRound size={15} />{changingPassword ? 'Changing...' : 'Change password'}</button></footer>
      </form>
    </div>
  );
}