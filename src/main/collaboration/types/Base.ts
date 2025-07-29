export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSpecific {
  userId: string;
}

export interface Timestamped {
  timestamp: string;
}