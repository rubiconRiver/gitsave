import { Injectable } from '@nestjs/common';

interface CachedData {
  data: any;
  timestamp: Date;
  ttl: number;
}

/**
 * In-memory cache for collaboration data
 */
@Injectable()
export class CollaborationCacheService {
  private cache = new Map<string, CachedData>();
  private readonly DEFAULT_TTL = 60000; // 60 seconds
  
  /**
   * Get data from cache
   */
  async get(key: string): Promise<any> {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if expired
    const now = new Date();
    const age = now.getTime() - cached.timestamp.getTime();
    
    if (age > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * Set data in cache
   */
  async set(key: string, data: any, ttl?: number): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl: ttl || this.DEFAULT_TTL,
    });
  }
  
  /**
   * Invalidate cache entries matching pattern
   */
  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const now = new Date();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const [key, cached] of this.cache.entries()) {
      const age = now.getTime() - cached.timestamp.getTime();
      if (age > cached.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
    };
  }
}