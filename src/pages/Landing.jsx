import { Link } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-grain" aria-hidden="true" />

      <header className="landing-header">
        <div className="landing-logo">
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
            <rect x="25" y="30" width="50" height="40" rx="3" stroke="var(--signal)" strokeWidth="6" />
            <line x1="35" y1="30" x2="35" y2="70" stroke="var(--signal)" strokeWidth="4" />
            <line x1="50" y1="30" x2="50" y2="70" stroke="var(--signal)" strokeWidth="4" />
            <line x1="65" y1="30" x2="65" y2="70" stroke="var(--signal)" strokeWidth="4" />
          </svg>
          <span>StockFlow</span>
        </div>
      </header>

      <main className="landing-main">
        <div className="landing-copy">
          <p className="landing-eyebrow">Inventory, tracked at the source</p>
          <h1 className="landing-title">
            Every item.<br />
            Every scan.<br />
            <span className="landing-title-accent">One feed.</span>
          </h1>
          <p className="landing-sub">
            Pick a workspace below. The shop floor scans items in and out; the owner watches it all happen live.
          </p>
        </div>

        <div className="landing-cards">
          <Link to="/login" className="landing-card landing-card--google">
            <span className="landing-card-tag">My Inventory</span>
            <h2>Sign in with Google</h2>
            <p>Your private inventory workspace. Import from Excel, track stock, and manage products.</p>
            <span className="landing-card-cta">Sign in →</span>
          </Link>

          <Link to="/owner" className="landing-card landing-card--owner">
            <span className="landing-card-tag">Owner</span>
            <h2>Password dashboard</h2>
            <p>Legacy owner dashboard with full inventory access. Password protected.</p>
            <span className="landing-card-cta">Enter dashboard →</span>
          </Link>

          <Link to="/worker" className="landing-card landing-card--worker">
            <span className="landing-card-tag">Worker</span>
            <h2>Scan items out</h2>
            <p>Point your camera at a barcode to remove it from stock. No login needed.</p>
            <span className="landing-card-cta">Start scanning →</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
