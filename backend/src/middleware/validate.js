const { z } = require("zod");

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return res
        .status(400)
        .json({ error: "Validation failed.", details: errors });
    }

    req.body = result.data;
    next();
  };
}

// Common schemas
const setupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const packageSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  game_count: z.number().int().positive(),
});

const paymentResolveSchema = z.object({
  // No body usually, but can add notes if needed
});

const smsSendSchema = z.object({
  message: z.string().min(1).max(918),
  phone: z.string().optional(),
  tier: z.number().int().positive().optional(),
  active_tier_letter: z.string().length(1).optional(),
  active_sub_number: z.number().int().positive().optional(),
  jackpot: z.boolean().optional(),
  jackpot_tier: z.number().int().positive().optional(),
  subscription_customers: z.boolean().optional(),
});

module.exports = { validate, setupSchema, packageSchema, paymentResolveSchema, smsSendSchema };
