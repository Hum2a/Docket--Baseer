export type Env = {
  DOCUMENTS: R2Bucket;
  HYPERDRIVE?: Hyperdrive;
  DATABASE_URL?: string;
  /** Single fixed owner for all app data (no login). */
  OWNER_ID: string;
  /** Public API base URL (used for R2 proxy URLs). */
  API_URL: string;
  APP_URL: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  /** Resend API key for daily reminder digests (Worker secret). */
  RESEND_API_KEY?: string;
  /** Digest recipient (default baseer@baseer.co.uk). */
  REMINDER_EMAIL_TO?: string;
  /** Verified From header, e.g. Docket <reminders@baseer.co.uk>. */
  REMINDER_EMAIL_FROM?: string;
};
