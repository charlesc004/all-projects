import { conversionPercentage, csvCell, monthlyRevenue } from './reports.service';

describe('consistent reporting calculations', () => {
  it('uses closed date, ignores out-of-range records, and fills empty months', () => {
    expect(
      monthlyRevenue(
        [
          { closedAt: new Date('2026-06-30T23:59:59Z'), value: 100 },
          { closedAt: new Date('2026-07-01T00:00:00Z'), value: 1200.25 },
          { closedAt: new Date('2026-07-31T23:59:59Z'), value: 300 },
          { closedAt: null, value: 999 },
          { closedAt: new Date('2026-10-01T00:00:00Z'), value: 99 },
        ],
        new Date('2026-07-01T00:00:00Z'),
        new Date('2026-09-30T23:59:59Z'),
      ),
    ).toEqual([
      { month: '2026-07', revenue: 1500.25 },
      { month: '2026-08', revenue: 0 },
      { month: '2026-09', revenue: 0 },
    ]);
  });
  it('handles empty cohorts and rounds percentages to one decimal', () => {
    expect(conversionPercentage(0, 0)).toBe(0);
    expect(conversionPercentage(1, 3)).toBe(33.3);
  });
  it('neutralizes spreadsheet formulas and properly escapes quotes', () => {
    expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
    expect(csvCell('  +cmd')).toBe('"\'  +cmd"');
    expect(csvCell('A,"B"')).toBe('"A,""B"""');
  });
});
