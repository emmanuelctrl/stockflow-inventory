import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/useAuth';
import './GoogleLogin.css';

export default function GoogleLoginPage() {
  const { googleLogin, isUserAuthenticated, error, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isUserAuthenticated) navigate('/dashboard');
  }, [isUserAuthenticated, navigate]);

  async function handleSuccess(credentialResponse) {
    const success = await googleLogin(credentialResponse.credential);
    if (success) navigate('/dashboard');
  }

  return (
    <div className="glogin">
      <div className="glogin-panel">
        <Link to="/" className="glogin-back">← Back</Link>

        <div className="glogin-logo">
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
            <rect x="20" y="28" width="60" height="44" rx="4" stroke="var(--signal)" strokeWidth="6" />
            <line x1="33" y1="28" x2="33" y2="72" stroke="var(--signal)" strokeWidth="5" />
            <line x1="50" y1="28" x2="50" y2="72" stroke="var(--signal)" strokeWidth="5" />
            <line x1="67" y1="28" x2="67" y2="72" stroke="var(--signal)" strokeWidth="5" />
          </svg>
        </div>

        <h1 className="glogin-title">Sign in to StockFlow</h1>
        <p className="glogin-sub">Your inventory is private to your account. Each Google login gets its own workspace.</p>

        <div className="glogin-btn-wrap">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => {}}
            useOneTap={false}
            theme="filled_black"
            shape="rectangular"
            size="large"
            text="signin_with"
          />
        </div>

        {loading && <p className="glogin-status">Signing you in…</p>}
        {error && <p className="glogin-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
