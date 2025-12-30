declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
      ICON_STORAGE_PATH?: string;
      CACHE_TTL?: string;
      API_KEY?: string;
      CORS_ORIGIN?: string;
      FIGMA_API_TOKEN?: string;
      FIGMA_FILE_ID?: string;
      RATE_LIMIT_READ?: string;
      RATE_LIMIT_WRITE?: string;
      ICON_CONFLICT_STRATEGY?: 'overwrite' | 'reject';
    }
  }
}

export {};
