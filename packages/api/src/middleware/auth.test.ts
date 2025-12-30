import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticateApiKey } from './auth.js';
import { UnauthorizedError } from '../types/errors.js';

describe('authenticateApiKey middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    
    // Setup mock request, response, and next
    req = {
      headers: {},
      method: 'POST',
      url: '/api/upload',
      ip: '127.0.0.1',
    };
    res = {};
    next = vi.fn();
  });

  it('should allow request when API key is not configured (development mode)', () => {
    delete process.env.API_KEY;
    
    authenticateApiKey(req as Request, res as Response, next);
    
    expect(next).toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when API key is missing', () => {
    process.env.API_KEY = 'test-api-key';
    req.headers = {};
    
    expect(() => {
      authenticateApiKey(req as Request, res as Response, next);
    }).toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when API key is invalid (Bearer token)', () => {
    process.env.API_KEY = 'test-api-key';
    req.headers = {
      authorization: 'Bearer wrong-key',
    };
    
    expect(() => {
      authenticateApiKey(req as Request, res as Response, next);
    }).toThrow(UnauthorizedError);
  });

  it('should allow request with valid API key in Authorization header (Bearer token)', () => {
    process.env.API_KEY = 'test-api-key';
    req.headers = {
      authorization: 'Bearer test-api-key',
    };
    
    authenticateApiKey(req as Request, res as Response, next);
    
    expect(next).toHaveBeenCalled();
  });

  it('should allow request with valid API key in x-api-key header', () => {
    process.env.API_KEY = 'test-api-key';
    req.headers = {
      'x-api-key': 'test-api-key',
    };
    
    authenticateApiKey(req as Request, res as Response, next);
    
    expect(next).toHaveBeenCalled();
  });

  it('should throw UnauthorizedError when API key is invalid (x-api-key header)', () => {
    process.env.API_KEY = 'test-api-key';
    req.headers = {
      'x-api-key': 'wrong-key',
    };
    
    expect(() => {
      authenticateApiKey(req as Request, res as Response, next);
    }).toThrow(UnauthorizedError);
  });

  it('should prioritize Bearer token over x-api-key header', () => {
    process.env.API_KEY = 'test-api-key';
    req.headers = {
      authorization: 'Bearer test-api-key',
      'x-api-key': 'wrong-key',
    };
    
    authenticateApiKey(req as Request, res as Response, next);
    
    expect(next).toHaveBeenCalled();
  });
});
