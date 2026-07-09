export interface TmdbMovie {
  id: number;
  imdb_id?: string | null;
  title: string;
  original_title: string;
  release_date: string;
  poster_path: string | null;
  genres?: { id: number; name: string }[];
  genre_ids?: number[];
  runtime?: number;
  vote_average: number;
  vote_count: number;
  overview: string;
  external_ids?: {
    imdb_id: string | null;
  };
}
