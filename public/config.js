window.XENOCHAT_CONFIG = window.XENOCHAT_CONFIG || {};

(function() {
  try {
    const stored = localStorage.getItem('xenochat_api_url');
    if (stored) {
      window.XENOCHAT_CONFIG.API_URL = stored;
      return;
    }
  } catch (e) {}

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';
  const envUrl = typeof process !== 'undefined' && process.env && process.env.VITE_API_URL
    ? process.env.VITE_API_URL
    : null;

  window.XENOCHAT_CONFIG.API_URL = envUrl || (isLocal ? 'http://localhost:3000' : window.location.origin);
})();
