window.XENOCHAT_CONFIG = window.XENOCHAT_CONFIG || {};

(function() {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';

  if (isLocal) {
    window.XENOCHAT_CONFIG.API_URL = 'http://localhost:3000';
  } else {
    window.XENOCHAT_CONFIG.API_URL = 'https://xenowebsite.onrender.com';
  }
})();
