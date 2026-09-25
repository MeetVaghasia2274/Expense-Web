// Push subscription shape stored in Supabase
export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id?: string | null;
}

// Notification types
export type NotificationType = 'weekly' | 'monthly' | 'test';

// Payload sent from Edge Function to device
export interface PushPayload {
  type: NotificationType;
  title: string;
  body: string;
}

// Stats used to build notification messages
export interface WeeklyStats {
  total: number;
  count: number;
  topCategory: string;
}

export interface MonthlyStats {
  monthName: string;
  monthTotal: number;
  monthCount: number;
  weekTotal: number;
}
