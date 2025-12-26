/**
 * Content Security Policy (CSP) 配置
 *
 * 防止XSS、数据注入等攻击
 */

// CSP指令类型
interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'base-uri'?: string[];
  'form-action'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

// 开发环境CSP配置
const developmentCSP: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // 开发环境需要
    "'unsafe-eval'", // Next.js HMR需要
    'https://apis.google.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Tailwind CSS需要
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'https://cdnjs.cloudflare.com', // Font Awesome
  ],
  'connect-src': [
    "'self'",
    'https://generativelanguage.googleapis.com', // Gemini API
    'https://api.openai.com',
    'https://*.supabase.co',
    'wss://*.supabase.co',
  ],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'frame-src': [
    "'self'",
    'https://accounts.google.com', // Google OAuth
  ],
  'frame-ancestors': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

// 生产环境CSP配置（更严格）
const productionCSP: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    // 使用nonce或hash替代unsafe-inline
    'https://apis.google.com',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Tailwind需要，可考虑使用hash
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'https://cdnjs.cloudflare.com',
  ],
  'connect-src': [
    "'self'",
    'https://generativelanguage.googleapis.com',
    'https://*.supabase.co',
    'wss://*.supabase.co',
  ],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'frame-src': [
    "'self'",
    'https://accounts.google.com',
  ],
  'frame-ancestors': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': true,
  'block-all-mixed-content': true,
};

/**
 * 生成CSP头字符串
 * @param directives CSP指令配置
 * @returns CSP头字符串
 */
export function generateCSP(directives: CSPDirectives): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(directives)) {
    if (value === true) {
      parts.push(key);
    } else if (Array.isArray(value) && value.length > 0) {
      parts.push(`${key} ${value.join(' ')}`);
    }
  }

  return parts.join('; ');
}

/**
 * 获取当前环境的CSP配置
 * @returns CSP指令配置
 */
export function getCSPDirectives(): CSPDirectives {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? developmentCSP : productionCSP;
}

/**
 * 获取CSP头字符串
 * @returns CSP头字符串
 */
export function getCSPHeader(): string {
  return generateCSP(getCSPDirectives());
}

/**
 * 安全相关的HTTP头配置
 */
export const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: getCSPHeader(),
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];

/**
 * 用于next.config.js的headers配置
 */
export function getSecurityHeadersConfig() {
  return [
    {
      source: '/:path*',
      headers: securityHeaders,
    },
  ];
}

export default {
  generateCSP,
  getCSPDirectives,
  getCSPHeader,
  securityHeaders,
  getSecurityHeadersConfig,
};
