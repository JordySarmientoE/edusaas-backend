import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  DATABASE_SSL: Joi.boolean().truthy('true').truthy('1').falsy('false').falsy('0').default(false),
  DATABASE_SSL_REJECT_UNAUTHORIZED: Joi.boolean()
    .truthy('true')
    .truthy('1')
    .falsy('false')
    .falsy('0')
    .default(true),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_CONTEXT_SECRET: Joi.string().min(32).optional(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  JWT_CONTEXT_EXPIRES_IN: Joi.string().default('5m'),
  PORT: Joi.number().port().default(3000),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  FRONTEND_URL: Joi.string().uri().required(),
  STORAGE_PROVIDER: Joi.string().valid('local', 'cloudinary').default('local'),
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
  SEED_SUPER_ADMIN_EMAIL: Joi.string().email().default('admin@edusaas.com'),
  SEED_SUPER_ADMIN_PASSWORD: Joi.string().min(8).default('Admin123456!')
});
