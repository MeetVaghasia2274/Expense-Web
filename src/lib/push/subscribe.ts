import { supabase } from '../supabase';
import { urlBase64ToUint8Array } from './vapid';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

/**
 * Returns the active service worker registration, waiting for it to be ready.
 */
async function getRegistration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.ready;
}

/**
 * Subscribes the current device to Web Push and saves the subscription
 * to Supabase so the Edge Function can target it later.
 * Returns true on success, false on failure.
 */
export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!('PushManager' in window)) return false;

    const registration = await getRegistration();
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_id: user?.id ?? null,
      },
      { onConflict: 'endpoint' }
    );

    if (error) { console.error('Push subscription save error:', error); return false; }
    return true;
  } catch (err) {
    console.error('Push subscription error:', err);
    return false;
  }
}

/**
 * Unsubscribes the device and removes the record from Supabase.
 */
export async function unsubscribeFromPush(): Promise<void> {
  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

/**
 * Returns the current push subscription or null if not subscribed.
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await getRegistration();
  return registration.pushManager.getSubscription();
}
