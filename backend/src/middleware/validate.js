const { z } = require('zod');

// Validation middleware factory
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Format Zod errors into a clean array of field messages
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return res.status(400).json({
        error: 'Validation failed.',
        details: errors,
      });
    }

    // Replace req.body with the parsed, type-safe data
    req.body = result.data;
    next();
  };
}

// Schemas
// POST /api/setup/admin
const setupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters.')
    .max(100, 'Name must be under 100 characters.'),
  email: z.string()
    .email('A valid email address is required.'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be under 128 characters.'),
});

module.exports = { validate, setupSchema };