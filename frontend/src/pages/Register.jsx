import { useState } from 'react';
import { Activity, ArrowRight, ScanFace } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

export default function Register({ onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const result = await api.register(email, password);
      localStorage.setItem('people-track-token', result.token);
      onRegister(result.user);
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setBusy(false);
    }
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
        <form className="login-form" onSubmit={submit}>
          <span className="eyebrow">NEW WORKSPACE ACCOUNT</span>
          <h2>Create account</h2>
          <p>Register with your email and choose a password.</p>
          <label htmlFor="register-email">Email address</label>
          <input id="register-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="register-password">Password</label>
          <input id="register-password" type="password" autoComplete="new-password" minLength={4} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required />
          <small className="login-note">Use 4 to 128 characters.</small>
          <label htmlFor="register-confirm-password">Confirm password</label>
          <input id="register-confirm-password" type="password" autoComplete="new-password" minLength={4} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          {error && <p className="inline-error" role="alert">{error}</p>}
          <button className="button button-primary login-submit" disabled={busy}>
            {busy ? 'Creating account...' : 'Create account'}<ArrowRight size={17} />
          </button>
          <Link className="login-link register-link" to="/login">Already have an account? Sign in</Link>
        </form>
        <span className="login-footer">AI PEOPLE TRACK <span>•</span> PRIVATE BY DESIGN</span>
      </section>
    </main>
  );
}
