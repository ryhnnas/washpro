const { DomainError } = require('../utils/domainError');

// Resolve all IDs first, then only names whose IDs did not resolve. The name
// query uses the schema's name collation, preserving case/accent-insensitive matching.
const resolveTransactionServices = async (tx, businessId, items) => {
  const ids = [...new Set(items.map((item) => item.serviceId).filter(Boolean).map((id) => id.toLowerCase()))];
  const services = ids.length ? await tx.service.findMany({
    where: { businessId, id: { in: ids } },
  }) : [];
  const byId = new Map(services.map((service) => [service.id.toLowerCase(), service]));
  const names = [...new Set(items
    .filter((item) => !byId.has(item.serviceId?.toLowerCase()))
    .map((item) => item.serviceName).filter(Boolean))];
  const byName = new Map();

  if (names.length) {
    const namesJson = JSON.stringify(names);
    const matches = await tx.$queryRaw`
      SELECT s.id, s.name, s.price, s.unit,
             s.estimate_value AS estimateValue, s.estimate_unit AS estimateUnit,
             requested.requestIndex - 1 AS requestIndex
      FROM JSON_TABLE(${namesJson}, '$[*]' COLUMNS (requestIndex FOR ORDINALITY)) AS requested
      JOIN Service AS s ON s.business_id = ${businessId}
        AND s.name = JSON_UNQUOTE(JSON_EXTRACT(${namesJson}, CONCAT('$[', requested.requestIndex - 1, ']'))) COLLATE utf8mb4_unicode_ci
      ORDER BY s.id
    `;
    for (const match of matches) {
      const name = names[Number(match.requestIndex)];
      if (!byName.has(name)) byName.set(name, match);
    }
  }

  return items.map((item) => {
    const service = byId.get(item.serviceId?.toLowerCase()) || byName.get(item.serviceName);
    if (!service) {
      throw new DomainError(404, 'SERVICE_NOT_FOUND', `Layanan tidak ditemukan: ${item.serviceName || item.serviceId}`);
    }
    return { service, qty: item.qty };
  });
};

module.exports = { resolveTransactionServices };
