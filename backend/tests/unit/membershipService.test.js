const { calculateCoverage } = require('../../src/services/membershipService');

describe('Membership Service - Unit Tests', () => {
  describe('calculateCoverage', () => {
    it('should return NO_MEMBERSHIP if no active membership', () => {
      const result = calculateCoverage({
        transactionQty: 5,
        servicePrice: 10000,
        activeMembership: null,
        serviceId: 's1'
      });
      expect(result.reason).toBe('NO_MEMBERSHIP');
      expect(result.payableAmount).toBe(50000);
    });

    it('should calculate full coverage if quota is sufficient', () => {
      const activeMembership = {
        template: {
          quotaItems: [{ serviceId: 's1', deductionRate: 1 }]
        },
        balances: [{ serviceId: 's1', remainingQty: 10 }]
      };
      const result = calculateCoverage({
        transactionQty: 5,
        servicePrice: 10000,
        activeMembership,
        serviceId: 's1'
      });
      expect(result.isUsingMembership).toBe(true);
      expect(result.coveredAmount).toBe(50000);
      expect(result.payableAmount).toBe(0);
      expect(result.usedQty).toBe(5);
    });

    it('should calculate partial coverage if quota is insufficient', () => {
      const activeMembership = {
        template: {
          quotaItems: [{ serviceId: 's1', deductionRate: 1 }]
        },
        balances: [{ serviceId: 's1', remainingQty: 2 }]
      };
      const result = calculateCoverage({
        transactionQty: 5,
        servicePrice: 10000,
        activeMembership,
        serviceId: 's1'
      });
      expect(result.usedQty).toBe(2);
      expect(result.coveredAmount).toBe(20000);
      expect(result.payableAmount).toBe(30000);
    });
  });
});
