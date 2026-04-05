import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import TrendsScreen from './screens/TrendsScreen';

// ── iOS "Add to Home Screen" banner ────────────────────────────
function IOSInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      'standalone' in navigator && (navigator as { standalone?: boolean }).standalone;
    const dismissed = sessionStorage.getItem('ios-banner-dismissed');
    if (isIOS && !isStandalone && !dismissed) {
      // Slight delay so it doesn't flash on load
      const t = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('ios-banner-dismissed', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '398px',
        background: '#161B22',
        border: '1px solid #30363D',
        borderRadius: '16px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 300,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
      role="banner"
    >
      <span style={{ fontSize: 28, flexShrink: 0 }}>📲</span>
      <div style={{ flex: 1 }}>
        <p style={{ color: '#F0F6FC', fontSize: 13, fontWeight: 600, margin: 0 }}>
          Install for the best experience
        </p>
        <p style={{ color: '#8B949E', fontSize: 12, margin: '2px 0 0' }}>
          Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
        </p>
      </div>
      <button
        onClick={dismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#8B949E',
          fontSize: 20,
          cursor: 'pointer',
          padding: '4px',
          flexShrink: 0,
        }}
        aria-label="Dismiss install banner"
        id="dismiss-install-banner"
      >
        ✕
      </button>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<HomeScreen />} />
        <Route path="/trends"  element={<TrendsScreen />} />
      </Routes>
      <IOSInstallBanner />
    </BrowserRouter>
  );
}
