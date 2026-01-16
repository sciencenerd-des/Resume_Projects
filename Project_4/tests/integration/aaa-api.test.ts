import { describe, test, expect, beforeAll } from 'bun:test';
import { api } from '../../src/services/api';

// Test the API service structure and exports
// Note: These tests verify the exported API object structure, not actual API calls
describe('API Service', () => {
  describe('api object structure', () => {
    test('exports api object with expected methods', () => {
      expect(api).toBeDefined();
      expect(api).toHaveProperty('getWorkspaces');
      expect(api).toHaveProperty('createWorkspace');
      expect(api).toHaveProperty('getDocuments');
      expect(api).toHaveProperty('uploadDocument');
      expect(api).toHaveProperty('deleteDocument');
      expect(api).toHaveProperty('getSessions');
      expect(api).toHaveProperty('getSession');
      expect(api).toHaveProperty('getSessionMessages');
      expect(api).toHaveProperty('getSessionLedger');
      expect(api).toHaveProperty('deleteSession');
      expect(api).toHaveProperty('exportSession');
      expect(api).toHaveProperty('createQuery');
    });

    test('getWorkspaces is a function', () => {
      expect(typeof api.getWorkspaces).toBe('function');
    });

    test('createWorkspace is a function', () => {
      expect(typeof api.createWorkspace).toBe('function');
    });

    test('getDocuments is a function', () => {
      expect(typeof api.getDocuments).toBe('function');
    });

    test('uploadDocument is a function', () => {
      expect(typeof api.uploadDocument).toBe('function');
    });

    test('deleteDocument is a function', () => {
      expect(typeof api.deleteDocument).toBe('function');
    });

    test('getSessions is a function', () => {
      expect(typeof api.getSessions).toBe('function');
    });

    test('getSession is a function', () => {
      expect(typeof api.getSession).toBe('function');
    });

    test('createQuery is a function', () => {
      expect(typeof api.createQuery).toBe('function');
    });

    test('exportSession is a function', () => {
      expect(typeof api.exportSession).toBe('function');
    });

    test('deleteSession is a function', () => {
      expect(typeof api.deleteSession).toBe('function');
    });

    test('getSessionMessages is a function', () => {
      expect(typeof api.getSessionMessages).toBe('function');
    });

    test('getSessionLedger is a function', () => {
      expect(typeof api.getSessionLedger).toBe('function');
    });

    test('getWorkspaceSessions is a function', () => {
      expect(typeof api.getWorkspaceSessions).toBe('function');
    });
  });
});
