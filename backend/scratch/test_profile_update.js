const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'owner@washpro.local';
  console.log(`[TEST] Starting profile update / change password test for: ${email}`);

  // 1. Get user to get valid JWT token (via login)
  console.log('[TEST] Logging in to get token...');
  const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'owner12345' })
  });

  const loginData = await loginResponse.json();
  if (loginResponse.status !== 200) {
    throw new Error('Login failed');
  }

  const token = loginData.token;
  console.log('[TEST] Login success, token acquired.');

  // 2. Try to change password with WRONG currentPassword
  console.log('[TEST] Attempting password change with WRONG current password...');
  const failResponse = await fetch('http://localhost:5001/api/auth/profile', {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name: 'Owner Demo', currentPassword: 'wrongpassword', password: 'newsecurepassword' })
  });

  const failData = await failResponse.json();
  console.log('[TEST] Fail response status:', failResponse.status);
  console.log('[TEST] Fail response body:', failData);

  if (failResponse.status !== 401 || failData.message !== 'Password saat ini salah') {
    throw new Error('Failed to reject wrong current password correctly');
  }
  console.log('[TEST] Successfully rejected wrong current password!');

  // 3. Try to change password with CORRECT currentPassword
  console.log('[TEST] Attempting password change with CORRECT current password...');
  const successResponse = await fetch('http://localhost:5001/api/auth/profile', {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name: 'Owner Demo', currentPassword: 'owner12345', password: 'newsecurepassword' })
  });

  const successData = await successResponse.json();
  console.log('[TEST] Success response status:', successResponse.status);
  console.log('[TEST] Success response body:', successData);

  if (successResponse.status !== 200) {
    throw new Error('Failed to update password with correct current password');
  }
  console.log('[TEST] Password updated successfully!');

  // 4. Verify login with the new password
  console.log('[TEST] Verifying login with the new password...');
  const newLoginResponse = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'newsecurepassword' })
  });

  const newLoginData = await newLoginResponse.json();
  console.log('[TEST] New login status:', newLoginResponse.status);
  if (newLoginResponse.status !== 200) {
    throw new Error('Could not login with the new password');
  }
  console.log('[TEST] Login with new password succeeded!');

  // 5. Restore original password 'owner12345'
  console.log('[TEST] Restoring original password...');
  const bcrypt = require('bcryptjs');
  const originalHashed = await bcrypt.hash('owner12345', 10);
  await prisma.user.update({
    where: { email },
    data: { password: originalHashed }
  });
  console.log('[TEST] Original password restored.');
  console.log('[TEST] SUCCESS! Profile change password verification completed perfectly!');
}

main()
  .catch(err => {
    console.error('[TEST] FAILED:', err);
  })
  .finally(() => prisma.$disconnect());
