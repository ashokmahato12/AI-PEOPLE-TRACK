import { useState } from 'react';
import { Activity, ArrowRight, Eye, EyeOff, ScanFace } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

export default function Login({ onLogin }) {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api.login(email, password);
      localStorage.setItem('people-track-token', result.token);
      onLogin(result.user);
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      setBusy(false);
      return;
    }

    try {
      await api.resetPassword(email, recoveryCode, newPassword);
      setPassword(newPassword);
      setRecoveryCode('');
      setNewPassword('');
      setConfirmPassword('');
      setView('login');
      setNotice('Password reset. Sign in with your new password.');
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setBusy(false);
    }
  };

  const showLogin = () => {
    setView('login');
    setError('');
    setNotice('');
  };

  return (
    <main className="login-page">
      <section className="login-art" aria-label="People tracking overview">
        <div className="art-grid" />
        <div className="art-brand"><span className="brand-mark"><Activity size={20} /></span> AI PEOPLE TRACK</div>
        <div className="art-content">
          <span className="eyebrow">LOCAL VISION · LIVE INSIGHTS</span>
          <h1>Every arrival<br />counts.</h1>
          <p>Private, real-time people tracking for the spaces you manage.</p>
          <div className="art-readout"><ScanFace size={19} /><span>VISION SYSTEM</span><strong>READY</strong></div>
        </div>
        <div className="art-coordinate">01 / PEOPLE INTELLIGENCE</div>
      </section>
      <section className="login-form-side">
        <form className="login-form" onSubmit={view === 'login' ? submit : submitReset}>
          <span className="eyebrow">SECURE WORKSPACE</span>
          <h2>{view === 'login' ? 'Welcome back' : 'Reset your password'}</h2>
          <p>{view === 'login' ? 'Sign in to open your tracking dashboard.' : 'Use your local recovery code to choose a new password.'}</p>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          {view === 'login' ? (
            <>
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button type="button" className="icon-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button className="login-link" type="button" onClick={() => { setView('reset'); setError(''); setNotice(''); }}>Forgot password?</button>
            </>
          ) : (
            <>
              <label htmlFor="recovery-code">Recovery code</label>
              <input id="recovery-code" type="password" autoComplete="off" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} required />
              <small className="login-note">Find the local recovery code in <code>backend/.env</code>.</small>
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={4} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
              <label htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" minLength={4} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </>
          )}
          {error && <p className="inline-error" role="alert">{error}</p>}
          {notice && <p className="inline-success" role="status">{notice}</p>}
          <button className="button button-primary login-submit" disabled={busy}>
            {busy ? 'Please wait...' : view === 'login' ? 'Sign in' : 'Reset password'}<ArrowRight size={17} />
          </button>
          {view === 'reset' ? (
            <button className="login-link login-back-link" type="button" onClick={showLogin}>Back to sign in</button>
          ) : (
            <>
              <small className="login-note">Use the administrator credentials configured in <code>backend/.env</code>.</small>
              <Link className="login-link register-link" to="/register">Create an account</Link>
            </>
          )}
        </form>
        <span className="login-footer">AI PEOPLE TRACK <span>•</span> PRIVATE BY DESIGN</span>
      </section>
    </main>
  );
}