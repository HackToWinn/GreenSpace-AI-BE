export interface Report {
  id: string;
  user: string; 
  category: string;
  description: string;
  location: string;
  coordinates: Location;
  imageCid: string;
  timestamp: Date; 
  status: string;
  rewardGiven: number | null;
}

export interface Reward {
}

export interface Location {
  latitude: number;
  longitude: number;
}

export type UserId = string;