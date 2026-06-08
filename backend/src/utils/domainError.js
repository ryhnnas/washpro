class DomainError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'DomainError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

module.exports = { DomainError };
