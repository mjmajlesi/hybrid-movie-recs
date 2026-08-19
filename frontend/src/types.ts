export interface SearchItem {
  id: string;
  type: 'movie' | 'show';
  name: string;
  year: number;
  genres: string;
  rating: number;
  poster_path?: string;
}

export interface Recommendation {
  item_id: string;
  title: string;
  type: 'movie' | 'show';
  score: number;
  genres: string;
  year: number;
  rating: number;
  reason: string;
  overview?: string;
  poster_path?: string;
}

export interface UserRating {
  item_id: string;
  rating: number;
  timestamp: number;
}

export interface RecommendResponse {
  user_id: number;
  total_ratings: number;
  recommendations: Recommendation[];
}