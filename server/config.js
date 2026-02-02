export default {
  environment: process.env.ENVIRONMENT || 'development',
  db: {
    url: process.env.DB_URL,
    disableSsl: process.env.DB_DISABLE_SSL === 'true'
  },
  cache: {
    url: process.env.CACHE_URL,
    disableSsl: process.env.CACHE_DISABLE_SSL === 'true'
  },
  storage: {
    base_dir: `${process.env.STORAGE_PATH}` || '/tmp/storage'
  },
  security: {
    token_size: 128,
    tokenKey: 'session_token',
    hide_server_errors: false,
    server_error_message: 'Server error',
    cors: {
      // origin: [new RegExp("http://localhost*")],
      origin: '*',
      credentials: true
    },
    login_url: `${process.env.SERVER_BASE_URL}/login.html`
  },
  server: {
    timeout: 30000,
    port: parseInt(process.env.SERVER_PORT || '8080'),
    base_url: process.env.SERVER_BASE_URL
  },
  session: {
    expire: 3600, // Expire time in seconds
    interval: 600 // Check interval in seconds
  },
  websockets: {
    enabled: true,
    lifetime: parseInt(process.env.WEBSOCKETS_PURGE_LIFETIME || '600') // Lifetime time in seconds
  },
  i18n: {
    default_language: 'es'
  },
  services: {
    email: {
      fromEmailAddress: process.env.SERVICE_MAIL_FROM_ADDRESS,
      supportEmailAddress: process.env.SERVICE_EMAIL_SUPPORT_EMAIL,
      drainEmailAddress: process.env.SERVICE_MAIL_DRAIN_ADDRESS,
      logoUrl: process.env.SERVICE_EMAIL_LOGO_URL,
      service: process.env.SERVICE_MAIL_SMTP_SERVICE,
      user: process.env.SERVICE_MAIL_DRAIN_ADDRESS,
      host: process.env.SERVICE_MAIL_SMTP_HOST,
      port: parseInt(process.env.SERVICE_MAIL_SMTP_PORT || '465'),
      secure: (process.env.SERVICE_MAIL_SMTP_SECURE === 'true'),
      password: process.env.SERVICE_MAIL_PASSWORD
    }
  },
  log: {
    level: process.env.LOG_LEVEL || 'DEBUG'
  }
}
