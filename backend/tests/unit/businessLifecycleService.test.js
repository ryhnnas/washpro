const { resolveReactivationStatus } = require('../../src/services/businessLifecycleService');

const NOW = new Date('2026-10-15T00:00:00Z');
const day = (n) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe('resolveReactivationStatus', () => {
  it('refuses deleted businesses', () => {
    const result = resolveReactivationStatus(
      { deletedAt: day(-1), subscriptionEndAt: day(10), trialEndAt: null }, NOW,
    );
    expect(result).toEqual({ ok: false, code: 'BUSINESS_DELETED' });
  });

  it('returns ACTIVE only while a paid subscription is still running', () => {
    const result = resolveReactivationStatus(
      { deletedAt: null, subscriptionEndAt: day(5), trialEndAt: day(-20) }, NOW,
    );
    expect(result).toEqual({ ok: true, status: 'ACTIVE' });
  });

  it('returns TRIAL when the store never paid and the trial is still running', () => {
    const result = resolveReactivationStatus(
      { deletedAt: null, subscriptionEndAt: null, trialEndAt: day(3) }, NOW,
    );
    expect(result).toEqual({ ok: true, status: 'TRIAL' });
  });

  it('returns EXPIRED when the store never paid and the trial is over', () => {
    const result = resolveReactivationStatus(
      { deletedAt: null, subscriptionEndAt: null, trialEndAt: day(-1) }, NOW,
    );
    expect(result).toEqual({ ok: true, status: 'EXPIRED' });
  });

  it('returns EXPIRED when the paid subscription already lapsed', () => {
    const result = resolveReactivationStatus(
      { deletedAt: null, subscriptionEndAt: day(-2), trialEndAt: day(-40) }, NOW,
    );
    expect(result).toEqual({ ok: true, status: 'EXPIRED' });
  });

  it('never returns ACTIVE without an end date', () => {
    const result = resolveReactivationStatus(
      { deletedAt: null, subscriptionEndAt: null, trialEndAt: null }, NOW,
    );
    expect(result).toEqual({ ok: true, status: 'EXPIRED' });
  });
});
