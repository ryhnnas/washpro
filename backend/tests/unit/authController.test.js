const { login, registerOwner } = require('../../src/controllers/authController');
const prisma = require('../../src/config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/prisma', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    business: {
      create: jest.fn(),
    },
    businessSetting: {
      create: jest.fn(),
    },
    service: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(callback => callback(mockPrisma)),
  };
  return mockPrisma;
});

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Controller - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      req.body = { email: 'test@example.com', password: 'password123' };
      const mockUser = { id: '1', email: 'test@example.com', password: 'hashed_password', businessId: 'biz-1' };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock_token');

      await login(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        token: 'mock_token',
        message: 'Login Berhasil'
      }));
    });

    it('should return 404 if user not found', async () => {
      req.body = { email: 'notfound@example.com' };
      prisma.user.findUnique.mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User tidak ditemukan' });
    });

    it('should return 401 for incorrect password', async () => {
      req.body = { email: 'test@example.com', password: 'wrong' };
      prisma.user.findUnique.mockResolvedValue({ password: 'hashed' });
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password salah' });
    });
  });

  describe('registerOwner', () => {
    it('should create business, user, settings, and default services in a transaction', async () => {
      req.body = { businessName: 'WashIt', ownerName: 'Owner', email: 'owner@washit.com', password: 'pass' };

      bcrypt.hash.mockResolvedValue('hashed');
      prisma.business.create.mockResolvedValue({ id: 'biz-1' });
      prisma.user.create.mockResolvedValue({ id: 'user-1' });

      await registerOwner(req, res);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.business.create).toHaveBeenCalled();
      expect(prisma.service.createMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
