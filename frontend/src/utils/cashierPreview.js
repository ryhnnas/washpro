export function calculateCashierPreview(selectedItems, membership, packages = []) {
  const grouped = new Map();
  for (const { service, qty } of selectedItems) {
    if (!Number.isFinite(qty) || qty <= 0) continue;
    grouped.set(service.id, { service, qty: (grouped.get(service.id)?.qty || 0) + qty });
  }
  const template = packages.find(p => p.id === membership?.templateId);
  const items = [...grouped.values()].map(({ service, qty }) => {
    const lineTotal = Math.round(qty * service.price);
    const quotaItem = template?.items?.find(i => i.serviceId === service.id);
    const balance = membership?.balances?.find(b => b.serviceId === service.id);
    const rate = quotaItem?.deductionRate == null ? 1 : Number(quotaItem.deductionRate);
    const allowed = membership?.isActive && quotaItem && balance && Number.isFinite(rate) && rate > 0;
    const required = qty * rate;
    const consumedQuota = allowed ? Math.min(required, Math.max(0, Number(balance.remainingQty) || 0)) : 0;
    const coveredAmount = allowed ? Math.min(lineTotal, Math.round(qty * service.price * consumedQuota / required)) : 0;
    return { serviceId: service.id, serviceName: service.name, unit: service.unit, qty, lineTotal,
      coveredAmount, payableAmount: lineTotal - coveredAmount, consumedQuota };
  });
  return items.reduce((out, item) => ({ ...out, totalPrice: out.totalPrice + item.lineTotal,
    coveredAmount: out.coveredAmount + item.coveredAmount, payableAmount: out.payableAmount + item.payableAmount }),
  { totalPrice: 0, coveredAmount: 0, payableAmount: 0, items });
}
