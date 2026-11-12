export type ConcernId = 'hair' | 'underarm' | 'neck' | 'other';
export type UseId = 'most' | 'half' | 'few' | 'none';
export type QuickId = 'better' | 'same' | 'worse' | 'unsure';
export type FollowUp = 'settled' | 'doctor' | 'still';
export type LookKind = 'early' | 'full' | 'extra';

export interface Tracker {
  id: string;
  concern: ConcernId;
  /** Short name for "Something else". */
  customName?: string;
  productId: string;
  productName: string;
  /** The day she started using the product. */
  startDate: string;
  /** The day this tracker was created (app date). */
  createdDate: string;
  setupUse: UseId;
  packDays: number;
  packOpened: string;
  /** Photo views in use, at least one. */
  views: string[];
  interval: 14 | 28;
  /** Her own full-look window, when her pack says something different. */
  fullWeeks?: number;
  status: 'active' | 'closed';
  closedDate?: string;
  closedReason?: 'done' | 'stopped';
  /** Set by "Keep tracking": one more look at this many weeks of real use. */
  extraLookWeeks?: number;
  /** The day "Keep tracking" was chosen. */
  extraSetDate?: string;
  /** Pack end date she already answered, so the card doesn't come back. */
  packDismissedFor?: string;
  createdAt: number;
}

export interface Checkin {
  id: string;
  trackerId: string;
  date: string;
  use: UseId;
  changes: string[];
  warnings: string[];
  followUp?: FollowUp;
  quick?: QuickId;
  note?: string;
  createdAt: number;
}

export type EventType = 'change' | 'warning' | 'warningClosed' | 'pause' | 'resume' | 'pack';

export interface TrackerEvent {
  id: string;
  trackerId: string;
  date: string;
  type: EventType;
  code?: string;
  how?: 'settled' | 'doctor';
  createdAt: number;
}

export interface Photo {
  id: string;
  trackerId: string;
  view: string;
  /** The day the photo was taken. */
  date: string;
  /** Mean luminance (0 to 255) of the centre of the photo. */
  brightness: number;
  width: number;
  height: number;
  lightDiffers?: boolean;
  source: 'camera' | 'gallery' | 'live' | 'older';
  checkinId?: string;
  createdAt: number;
}

export interface LookPick {
  view: string;
  firstId: string;
  latestId: string;
  /** True when the newer photo was shown as A, on the left. */
  latestOnLeft: boolean;
  pick: 'A' | 'B' | 'same';
}

export interface Look {
  id: string;
  trackerId: string;
  date: string;
  kind: LookKind;
  picks: LookPick[];
  sense?: QuickId;
  chooser: 'self' | 'someone';
  skippedPhotos?: boolean;
  createdAt: number;
}

export interface TrackerData {
  tracker: Tracker;
  checkins: Checkin[];
  events: TrackerEvent[];
  photos: Photo[];
  looks: Look[];
}
