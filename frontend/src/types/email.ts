export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

export type EmailStatus = "scheduled" | "processing" | "sent" | "failed";
export type EmailKind = "scheduled" | "sent";

export interface EmailSummary {
  id: string;
  campaign_id: string;
  recipient: string;
  sender: string;
  subject: string;
  preview: string;
  status: EmailStatus;
  scheduled_time: string;
  sent_time: string | null;
  error: string | null;
}

export interface EmailDetail extends EmailSummary {
  body: string;
  attempts: number;
  preview_url: string | null;
}

export interface EmailListResponse {
  emails: EmailSummary[];
  total: number;
}

export interface EmailListParams {
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface EmailStats {
  scheduled: number;
  sent: number;
}

export interface ScheduleRequest {
  subject: string;
  body: string;
  startTime: string;
  /** Delay between two emails of the campaign, in milliseconds. */
  delay: number;
  hourlyLimit?: number;
  recipients: string[];
  sender?: string;
}

export interface ScheduleResponse {
  campaignId: string;
  totalRecipients: number;
  firstScheduledTime: string;
  lastScheduledTime: string;
}
