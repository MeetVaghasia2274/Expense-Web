import { useState, useEffect } from 'react';
import { subscribeToPush, unsubscribeFromPush, getCurrentSubscription } from '../lib/push/subscribe';
import { sendTestPush } from '../lib/push/testPush';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export default function PushNotificationSettings() {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);

  useEffect(() => {
    if (!('Notification' in window) || !('PushManager' in window)) {
      setPermission('unsupported'); return;
    }
    setPermission(Notification.permission as PermissionState);
    getCurrentSubscription().then((sub) => {
      setSubscribed(!!sub);
      if (sub) setCurrentEndpoint(sub.endpoint);
    });
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    if (result === 'granted') {
      const ok = await subscribeToPush();
      setSubscribed(ok);
      if (ok) {
        const sub = await getCurrentSubscription();
        setCurrentEndpoint(sub?.endpoint ?? null);
      }
    }
    setLoading(false);
  };

  const handleDisable = async () => {
    setLoading(true);
    await unsubscribeFromPush();
    setSubscribed(false);
    setCurrentEndpoint(null);
    setLoading(false);
  };

  const handleTestPush = async () => {
    if (!currentEndpoint) return;
    setTestLoading(true);
    await sendTestPush(currentEndpoint);
    setTestLoading(false);
  };

  const statusLabel = (() => {
    if (permission === 'unsupported') return 'Not supported on this browser';
    if (permission === 'denied') return 'Blocked — enable in device Settings';
    if (subscribed) return 'Active — weekly & monthly summaries enabled';
    return 'Off';
  })();

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    overflow: 'hidden',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
  };

  const labelStyle: React.CSSProperties = { color: 'var(--text-primary)', fontSize: 15, fontWeight: 500 };
  const subStyle: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 };

  const btnStyle = (variant: 'primary' | 'ghost'): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: 10,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    background: variant === 'primary' ? 'var(--accent)' : 'transparent',
    color: variant === 'primary' ? 'var(--bg-primary)' : 'var(--text-secondary)',
    opacity: loading ? 0.5 : 1,
  });

  const divider: React.CSSProperties = { borderTop: '1px solid var(--border)', margin: '0 16px' };

  return (
    <section>
      <h2 style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, paddingLeft: 4 }}>
        Notifications
      </h2>
      <div style={cardStyle}>
        <div style={rowStyle}>
          <div>
            <p style={labelStyle}>Push Notifications</p>
            <p style={subStyle}>{statusLabel}</p>
          </div>
          {permission !== 'unsupported' && permission !== 'denied' && (
            <button
              id="push-notifications-toggle"
              style={btnStyle('primary')}
              disabled={loading}
              onClick={subscribed ? handleDisable : handleEnable}
            >
              {loading ? '...' : subscribed ? 'Disable' : 'Enable'}
            </button>
          )}
        </div>

        {subscribed && (
          <>
            <div style={divider} />
            <div style={rowStyle}>
              <div>
                <p style={labelStyle}>Send Test Notification</p>
                <p style={subStyle}>Verify delivery on your device</p>
              </div>
              <button
                id="push-test-btn"
                style={btnStyle('ghost')}
                disabled={testLoading}
                onClick={handleTestPush}
              >
                {testLoading ? '...' : 'Send'}
              </button>
            </div>
            <div style={divider} />
            <div style={{ padding: '12px 16px' }}>
              <p style={{ ...subStyle, fontSize: 11, lineHeight: 1.5 }}>
                Weekly summary every Sunday at 8 PM · Month-end summary on the last day of each month.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
