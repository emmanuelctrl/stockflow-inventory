import './ScanFeed.css';

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(isoString).toLocaleDateString();
}

export default function ScanFeed({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="scanfeed-empty">
        <p>No scans yet.</p>
        <p className="scanfeed-empty-sub">Activity from the worker scanning page will appear here as it happens.</p>
      </div>
    );
  }

  return (
    <ul className="scanfeed">
      {entries.map((entry) => (
        <li key={entry.id} className={`scanfeed-row scanfeed-row--${entry.type}`}>
          <span className="scanfeed-dot" />
          <div className="scanfeed-main">
            <span className="scanfeed-name">{entry.name}</span>
            <span className="scanfeed-meta">
              {entry.type === 'created' && 'added to catalog'}
              {entry.type === 'add' && `+${entry.quantityChange} scanned in`}
              {entry.type === 'remove' && `${entry.quantityChange} scanned out`}
              {' · '}{entry.actor === 'owner' ? 'owner' : 'worker'} · {timeAgo(entry.timestamp)}
            </span>
          </div>
          <span className="scanfeed-result mono-num">{entry.resultingQuantity}</span>
        </li>
      ))}
    </ul>
  );
}
