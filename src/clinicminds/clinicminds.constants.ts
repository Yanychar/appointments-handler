export const CLINICMINDS_API_BASE_URL =
  'https://app.clinicminds.com/api/triggers-actions';

export const CLINICMINDS_DEFAULT_EVENTS = [
  'appointment_scheduled',
  'appointment_cancelled',
] as const;

export type ClinicmindsEventCode =
  (typeof CLINICMINDS_DEFAULT_EVENTS)[number] | (string & {});
