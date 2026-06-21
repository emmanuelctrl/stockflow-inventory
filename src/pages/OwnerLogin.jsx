import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import './OwnerLogin.css';

export default function OwnerLogin() {
  const [password, setPassword] = useState('');
  const { login, error, loading, setError } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const success = await login(password);
    if (success) navigate('/owner/dashboard');
  }

  return (
    <div className="ownerlogin">
      <div className="ownerlogin-panel">
        <Link to="/" className="ownerlogin-back">← Back</Link>

        <div className="ownerlogin-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        <h1>Owner access</h1>
        <p className="ownerlogin-sub">Enter the dashboard password to view inventory and reports.</p>

        <form onSubmit={handleSubmit} className="ownerlogin-form">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            inputMode="numeric"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
          />
          {error && <p className="ownerlogin-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading || !password}>
            {loading ? 'Checking…' : 'Unlock dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
