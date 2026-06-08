const { requireStaffPermission, requireOwner } = require('../../src/middleware/staffPermission');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/config/prisma', () => ({
  businessSetting: { findUnique: jest.fn() },
}));

describe('Staff Permission Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { role: 'STAFF', businessId: 'biz-1' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('allows OWNER without checking settings', async () => {
    req.user.role = 'OWNER';
    await requireStaffPermission('REPORTS', { write: false })(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('denies STAFF when REPORTS flag is off', async () => {
    prisma.businessSetting.findUnique.mockResolvedValue({
      allowStaffReports: false,
    });
    await requireStaffPermission('REPORTS', { write: false })(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'STAFF_PERMISSION_DENIED' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('allows STAFF when REPORTS flag is on', async () => {
    prisma.businessSetting.findUnique.mockResolvedValue({
      allowStaffReports: true,
    });
    await requireStaffPermission('REPORTS', { write: false })(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('requireOwner denies STAFF for subscription routes', async () => {
    await requireOwner()(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'STAFF_PERMISSION_DENIED' }));
  });
});
