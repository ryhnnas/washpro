import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canAccessStaffMenu } from '../src/utils/staffAccess.js';
test('staff optional menus deny malformed settings but retain operational access', () => {
  for (const raw of ['{broken', '{}', 'null', '"DASHBOARD"', '[]']) {
    assert.equal(canAccessStaffMenu({ role: 'STAFF' }, { staffAllowedMenus: raw }, 'DASHBOARD'), false);
    assert.equal(canAccessStaffMenu({ role: 'STAFF' }, { staffAllowedMenus: raw }, 'CASHIER'), true);
  }
});
test('dashboard does not imply reports and owners retain both', () => {
  const settings = { staffAllowedMenus: '["DASHBOARD"]' };
  assert.equal(canAccessStaffMenu({ role: 'STAFF' }, settings, 'DASHBOARD'), true);
  assert.equal(canAccessStaffMenu({ role: 'STAFF' }, settings, 'REPORTS'), false);
  assert.equal(canAccessStaffMenu({ role: 'OWNER' }, null, 'REPORTS'), true);
  assert.equal(canAccessStaffMenu(null, settings, 'DASHBOARD'), false);
});
