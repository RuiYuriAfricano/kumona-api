export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'kumona-secret-key',
    expiresIn: process.env.JWT_EXPIRATION || '24h',
  },
  ai: {
    serviceUrl: process.env.AI_SERVICE_URL,
    apiKey: process.env.AI_SERVICE_API_KEY,
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@kumonavision.com',
  },
  environment: process.env.NODE_ENV || 'development',
});
