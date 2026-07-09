export interface MovieDto {
  id: string;
  tmdbId: number;
  imdbId: string | null;
  title: string;
  year: number;
  posterUrl: string | null;
  genres: string[];
  runtime: number | null;
  overview: string;
  /** Outbound links generated from stored IDs */
  links: MovieLinks;
}

export interface MovieLinks {
  tmdb: string;
  imdb: string | null;
  letterboxd: string;
}
