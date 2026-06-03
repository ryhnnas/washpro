const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'owner@washpro.local';
  console.log(`[TEST] Starting reset password test for: ${email}`);

  // 1. Trigger forgot-password API
  console.log('[TEST] Requesting forgot-password...');
  const forgotResponse = await fetch('http://localhost:5001/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const forgotData = await forgotResponse.json();
  console.log('[TEST] Forgot response status:', forgotResponse.status);
  console.log('[TEST] Forgot response body:', forgotData);

  if (forgotResponse.status !== 200) {
    throw new Error('Forgot password request failed');
  }

  // 2. Read token from database
  const user = await prisma.user.findUnique({
    where: { email }
  });
  console.log('[TEST] User token in DB:', user.resetPasswordToken);
  console.log('[TEST] User token expires in DB:', user.resetPasswordExpires);

  if (!user.resetPasswordToken) {
    throw new Error('Token was not saved to database');
  }

  // 3. Reset password using the token
  const newPassword = 'newpassword123';
  console.log(`[TEST] Resetting password to "${newPassword}"...`);
  const resetResponse = await fetch('http://localhost:5001/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: user.resetPasswordToken, password: newPassword })
  });

  const resetData = await resetResponse.json();
  console.log('[TEST] Reset response status:', resetResponse.status);
  console.log('[TEST] Reset response body:', resetData);

  if (resetResponse.status !== 200) {
    throw new Error('Reset password request failed');
  }

  // 4. Try to login with the new password
  console.log('[TEST] Verifying login with new password...');
  const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: newPassword })
  });

  const loginData = await loginResponse.json();
  console.log('[TEST] Login status:', loginResponse.status);
  console.log('[TEST] Login response body:', loginData);

  if (loginResponse.status !== 200) {
    throw new Error('Login with new password failed');
  }

  // 5. Restore original password 'owner12345'
  console.log('[TEST] Restoring original password...');
  const bcrypt = require('bcryptjs');
  const originalHashed = await bcrypt.hash('owner12345', 10);
  await prisma.user.update({
    where: { email },
    data: { password: originalHashed }
  });
  console.log('[TEST] Original password restored.');
  console.log('[TEST] SUCCESS! Reset password flow works perfectly!');
}

main()
  .catch(err => {
    console.error('[TEST] FAILED:', err);
  })
  .finally(() => prisma.$disconnect());
