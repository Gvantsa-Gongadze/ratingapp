import type { RankingPeriod } from '@ratingapp/shared-types';

/**
 * Calendar boundaries (not rolling windows) so "Today" flips over at
 * the user's actual midnight rather than 24 hours after their last
 * rating. Falls back to UTC if no timezone (or an invalid one) is given.
 */
export function cutoffForPeriod(period: RankingPeriod, timeZone?: string): Date | null {
  const zone = resolveTimeZone(timeZone);
  const now = new Date();
  switch (period) {
    case 'daily':
      return startOfDayInZone(now, zone);
    case 'weekly':
      return startOfWeekInZone(now, zone);
    case 'monthly':
      return startOfMonthInZone(now, zone);
    case 'all':
      return null;
  }
}

function resolveTimeZone(timeZone?: string): string {
  if (!timeZone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Offset (ms) such that `date.getTime() + offset`, read with the UTC
 * getters, yields the wall-clock date/time as observed in `timeZone`.
 * This is the standard trick for timezone math without a date library.
 */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

function startOfDayInZone(date: Date, timeZone: string): Date {
  const offsetMs = getTimeZoneOffsetMs(date, timeZone);
  const zoned = new Date(date.getTime() + offsetMs);
  zoned.setUTCHours(0, 0, 0, 0);
  return new Date(zoned.getTime() - offsetMs);
}

/** Monday-start week, per ISO 8601. */
function startOfWeekInZone(date: Date, timeZone: string): Date {
  const offsetMs = getTimeZoneOffsetMs(date, timeZone);
  const zoned = new Date(date.getTime() + offsetMs);
  const day = zoned.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  zoned.setUTCDate(zoned.getUTCDate() - daysSinceMonday);
  zoned.setUTCHours(0, 0, 0, 0);
  return new Date(zoned.getTime() - offsetMs);
}

function startOfMonthInZone(date: Date, timeZone: string): Date {
  const offsetMs = getTimeZoneOffsetMs(date, timeZone);
  const zoned = new Date(date.getTime() + offsetMs);
  zoned.setUTCDate(1);
  zoned.setUTCHours(0, 0, 0, 0);
  return new Date(zoned.getTime() - offsetMs);
}
