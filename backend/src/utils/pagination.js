/**
 * Pagination Utility
 * Mencegah client request limit terlalu besar yang bisa membebani database.
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MIN_PAGE = 1;

/**
 * Parse dan validasi pagination params dari query string.
 * @param {object} query - req.query
 * @param {object} options - { defaultLimit, maxLimit }
 * @returns {{ skip: number, take: number, page: number, limit: number }}
 */
const parsePagination = (query, options = {}) => {
  const maxLimit = options.maxLimit || MAX_LIMIT;
  const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;

  let page = parseInt(query.page, 10);
  if (!Number.isFinite(page) || page < MIN_PAGE) page = MIN_PAGE;

  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
};

/**
 * Build pagination response metadata.
 * @param {number} totalItems
 * @param {number} page
 * @param {number} limit
 */
const buildPaginationMeta = (totalItems, page, limit) => ({
  totalItems,
  currentPage: page,
  totalPages: Math.ceil(totalItems / limit),
  limit,
});

module.exports = { parsePagination, buildPaginationMeta, MAX_LIMIT, DEFAULT_LIMIT };
