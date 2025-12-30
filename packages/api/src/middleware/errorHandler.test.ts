import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler, asyncHandler } from './errorHandler.js';
import { 
  ValidationError, 
  NotFoundError, 
  InternalServerError,
  SVGParseError,
  StorageError 
} from '../types/errors.js';

describe('Error Handler Middleware', () => {
  describe('errorHandler', () => {
    it('should handle AppError with correct status code', () => {
      const error = new ValidationError('Invalid input');
      const req = {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-agent'),
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
          }),
        })
      );
    });

    it('should handle NotFoundError with 404 status', () => {
      const error = new NotFoundError('Resource not found');
      const req = {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-agent'),
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: 'Resource not found',
          }),
        })
      );
    });

    it('should handle SVGParseError with 400 status', () => {
      const error = new SVGParseError('Invalid SVG format');
      const req = {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-agent'),
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INVALID_SVG',
          }),
        })
      );
    });

    it('should handle StorageError with 500 status', () => {
      const error = new StorageError('Failed to write file');
      const req = {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-agent'),
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'STORAGE_ERROR',
          }),
        })
      );
    });

    it('should handle generic Error with 500 status', () => {
      const error = new Error('Something went wrong');
      const req = {
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1',
        get: vi.fn().mockReturnValue('test-agent'),
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'INTERNAL_SERVER_ERROR',
          }),
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with proper error format', () => {
      const req = {
        method: 'GET',
        url: '/nonexistent',
        ip: '127.0.0.1',
      } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      notFoundHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND',
            message: expect.stringContaining('/nonexistent'),
          }),
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('should catch async errors and pass to next', async () => {
      const error = new Error('Async error');
      const asyncFn = async () => {
        throw error;
      };
      const handler = asyncHandler(asyncFn);

      const req = {} as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle successful async operations', async () => {
      const asyncFn = vi.fn().mockResolvedValue(undefined);
      const handler = asyncHandler(asyncFn);

      const req = {} as Request;
      const res = {} as Response;
      const next = vi.fn() as NextFunction;

      await handler(req, res, next);

      expect(asyncFn).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
