/**
 * TMDB's movie genre list is a small, stable, publicly documented set
 * (https://developer.themoviedb.org/reference/genre-movie-list). Hardcoding it
 * avoids an extra API round trip just to resolve genre names to ids for filtering.
 */
export const TMDB_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const NAME_TO_ID = new Map(
  Object.entries(TMDB_GENRES).map(([id, name]) => [name.toLowerCase(), Number(id)]),
);

export function genreNameToId(name: string): number | undefined {
  return NAME_TO_ID.get(name.toLowerCase());
}

export function genreIdsToNames(ids: number[]): string[] {
  return ids.map((id) => TMDB_GENRES[id]).filter((name): name is string => Boolean(name));
}
