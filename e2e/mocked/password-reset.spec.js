const { test, expect } = require('@playwright/test');

const mockRecovery = async (page, { unavailable = false } = {}) => {
  const calls = [];
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    let status = 200;
    if (path === '/api/auth/me' || path === '/api/auth/refresh') {
      status = 401;
      body = { message: 'Tidak ada sesi aktif' };
    }
    else if (/\/(auth|superadmin)\/(forgot-password|verify-otp|reset-password)$/.test(path)) {
      calls.push({ path, body: route.request().postDataJSON() });
      if (path.endsWith('/forgot-password')) {
        status = unavailable ? 503 : 200;
        body = { message: unavailable ? 'Pengiriman OTP belum tersedia. Silakan coba lagi nanti atau hubungi admin.' : 'Jika email terdaftar, kode OTP akan dikirim ke email Anda.' };
      } else if (path.endsWith('/verify-otp')) body = { resetToken: 'test-reset-token' };
      else body = { message: 'Password berhasil direset.' };
    }
    await route.fulfill({ status, json: body });
  });
  return calls;
};

for (const role of ['OWNER', 'STAFF', 'SUPERADMIN']) {
  test(`${role} can request and submit recovery using the correct portal`, async ({ page }) => {
    const admin = role === 'SUPERADMIN';
    const prefix = admin ? '/superadmin' : '';
    const endpoint = admin ? '/api/superadmin' : '/api/auth';
    const email = `${role.toLowerCase()}@example.test`;
    const calls = await mockRecovery(page);
    await page.goto(`${prefix}/login`);
    await page.getByRole('link', { name: 'Lupa Password?' }).click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/forgot-password$`));
    await page.getByLabel('Email Terdaftar', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Kirim Kode OTP' }).click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/reset-password\\?email=`));
    await page.getByPlaceholder('123456').fill('123456');
    await page.getByPlaceholder('••••••••', { exact: true }).fill('NewPassword1!');
    await page.getByPlaceholder('Ulangi kata sandi').fill('NewPassword1!');
    await page.getByRole('button', { name: 'Simpan Kata Sandi' }).click();
    await expect(page.getByText('Kata sandi Anda berhasil diatur ulang!', { exact: true })).toBeVisible();
    expect(calls).toEqual([
      { path: `${endpoint}/forgot-password`, body: { email } },
      { path: `${endpoint}/verify-otp`, body: { email, otp: '123456' } },
      { path: `${endpoint}/reset-password`, body: { resetToken: 'test-reset-token', newPassword: 'NewPassword1!' } },
    ]);
    await expect(page).toHaveURL(new RegExp(`${prefix}/login$`));
  });
}

test('unavailable SMTP leaves the user on the request page with an honest error', async ({ page }) => {
  await mockRecovery(page, { unavailable: true });
  await page.goto('/forgot-password');
  await page.getByLabel('Email Terdaftar', { exact: true }).fill('owner@example.test');
  await page.getByRole('button', { name: 'Kirim Kode OTP' }).click();
  await expect(page.getByText('Pengiriman OTP belum tersedia. Silakan coba lagi nanti atau hubungi admin.', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/forgot-password$/);
});

for (const path of ['/forgot-password', '/reset-password', '/superadmin/forgot-password', '/superadmin/reset-password']) {
  test(`anonymous direct access to ${path} survives a failed session refresh`, async ({ page }) => {
    await mockRecovery(page);
    const refresh = page.waitForResponse((response) => response.url().endsWith('/api/auth/refresh') && response.status() === 401);
    await page.goto(path);
    await refresh;
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('button', { name: path.endsWith('/forgot-password') ? 'Kirim Kode OTP' : 'Simpan Kata Sandi' })).toBeVisible();
  });
}

test('recovered staff is not asked to change the password again while verifying email', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ json: {
    user: { id: 'staff', role: 'STAFF', email: 'staff@example.test', name: 'Staff', phone: '6281234567890', isEmailVerified: false, mustChangePassword: false },
  } }));
  await page.goto('/staff-onboarding');
  await expect(page.getByText('Kata sandi sudah diperbarui.', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Password saat ini')).toHaveCount(0);
  await expect(page.getByPlaceholder('Masukkan OTP 6 digit')).toBeVisible();
});
