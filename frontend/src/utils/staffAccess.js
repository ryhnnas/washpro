const ALWAYS = ['CASHIER', 'TRACKING', 'PROFILE'];
export function canAccessStaffMenu(user, settings, menu) {
  if (user?.role === 'OWNER') return true;
  if (user?.role !== 'STAFF') return false;
  if (ALWAYS.includes(menu)) return true;
  try {
    const menus = JSON.parse(settings?.staffAllowedMenus || '[]');
    return Array.isArray(menus) && menus.includes(menu);
  } catch { return false; }
}
