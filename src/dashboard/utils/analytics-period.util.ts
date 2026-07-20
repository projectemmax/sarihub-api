export type DashboardRange =
  | '1D'
  | '7D'
  | '1M'
  | '1Y';

export function resolveRange(range: DashboardRange) {
    const now = new Date();

    const currentEnd = now;

    const currentStart = new Date(now);

    switch (range) {
        case '1D':
        currentStart.setDate(now.getDate() - 1);
        break;

        case '7D':
        currentStart.setDate(now.getDate() - 7);
        break;

        case '1M':
        currentStart.setMonth(now.getMonth() - 1);
        break;

        case '1Y':
        currentStart.setFullYear(now.getFullYear() - 1);
        break;
    }

    const duration =
        currentEnd.getTime() -
        currentStart.getTime();

    const previousStart =
        new Date(currentStart.getTime() - duration);

    const previousEnd =
        currentStart;

    return {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
    };
}