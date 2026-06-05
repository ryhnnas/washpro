/**
 * protected.js — Middleware chain untuk route yang butuh:
 * 1. Autentikasi JWT (authMiddleware)
 * 2. Subscription aktif (checkSubscription)
 *
 * Gunakan sebagai pengganti authMiddleware di route yang perlu dilindungi subscription.
 * Contoh: router.get('/', protectedRoute, getServices);
 */
const authMiddleware = require('./auth');
const userGuard = require('./userGuard');
const checkSubscription = require('./checkSubscription');

const protectedRoute = [authMiddleware, userGuard, checkSubscription];

module.exports = protectedRoute;
