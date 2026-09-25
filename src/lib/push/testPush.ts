import { supabase } from '../supabase';

/**
 * Calls the Supabase Edge Function to send an immediate test push
 * notification to the current device subscription.
 * Returns true on success.
 */
export async function sendTestPush(endpoint: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: { type: 'test', endpoint },
    });
    if (error) {
      console.error('Test push error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Test push invocation error:', err);
    return false;
  }
}
