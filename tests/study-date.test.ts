import { describe, it, expect } from 'vitest';
import { formatStudyDate, studyDateYear } from '../src/lib/study-date';

describe('study calendar dates', () => {
  it.each(['America/Puerto_Rico', 'UTC', 'Pacific/Honolulu', 'Asia/Tokyo'])('preserves dates in %s', zone => {
    const original = process.env.TZ;
    try {
      process.env.TZ = zone;
      expect(formatStudyDate('2026-10-28')).toBe('10/28/2026');
      expect(formatStudyDate(new Date('2024-02-29T00:00:00Z'))).toBe('02/29/2024');
      expect(formatStudyDate('2026-01-01')).toBe('01/01/2026');
      expect(studyDateYear('2026-01-01')).toBe(2026);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
  it('handles a missing or invalid date', () => {
    expect(formatStudyDate('')).toBe('—');
  });
});
