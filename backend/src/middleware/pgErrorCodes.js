// PostgreSQL error code -> user-facing message.
// Kept separate from errorHandler.js so the handler stays about *logging
// and response dispatch*, not about maintaining this lookup table. Add
// new codes here only -- errorHandler.js shouldn't need to change.
module.exports = {
    23505: 'A record with this value already exists.',
    23503: 'This record references a value that does not exist.',
    23502: 'A required field is missing.',
    23514: 'The data provided violates business validation rules.',
    '22P02': 'Invalid data format provided.',
    '42P01': 'Database table not found.',
    53300: 'Too many database connections.',
    '08006': 'Database connection failed.',
};