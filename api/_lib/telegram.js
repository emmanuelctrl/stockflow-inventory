const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Sends a plain-text message to the configured Telegram chat.
 * Silently no-ops (with a console warning) if Telegram isn't configured yet,
 * so the rest of the app keeps working even before you add the env vars.
 */
export async function sendTelegramMessage(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('Telegram not configured — skipping notification. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
    return { skipped: true };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML'
      })
    });
    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram API error:', data.description);
    }
    return data;
  } catch (err) {
    // Notification failures should never break the actual inventory operation.
    console.error('Failed to send Telegram message:', err.message);
    return { error: err.message };
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildScanMessage({ type, name, barcode, quantityChange, resultingQuantity, isLow, lowThreshold }) {
  const safeName = escapeHtml(name);
  let header;
  if (type === 'created') {
    header = `🆕 <b>${safeName}</b> added to catalog`;
  } else if (type === 'add') {
    header = `📥 <b>${safeName}</b> +${quantityChange}`;
  } else {
    header = `📤 <b>${safeName}</b> ${quantityChange}`;
  }

  let lines = [header, `Barcode: ${escapeHtml(barcode)}`, `Now in stock: ${resultingQuantity}`];

  if (isLow) {
    lines.push(`⚠️ Low stock — at or below threshold of ${lowThreshold}`);
  }

  return lines.join('\n');
}
