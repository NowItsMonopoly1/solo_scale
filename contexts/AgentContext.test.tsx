// contexts/AgentContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, renderHook, cleanup } from '@testing-library/react';
import { AgentProvider, useAgent } from './AgentContext';
import { GeminiService } from '../services/geminiService';import { APIService } from '../services/apiService';
// Mock GeminiService
vi.mock('../services/geminiService', () => ({
  GeminiService: {
    getInstance: vi.fn(() => ({
      updateConfig: vi.fn(),
      extractMortgageData: vi.fn(),
      chatWithSpeedAgent: vi.fn(),
      analyzeLeadUrgency: vi.fn(),
      extractDocumentData: vi.fn(),
      ai: {
        getGenerativeModel: vi.fn(() => ({
          generateContent: vi.fn(() => ({
            response: { text: vi.fn(() => 'Hi Client, this is Broker. We need your YTD income. Please resend!') }
          }))
        }))
      }
    }))
  }
}));

// Mock APIService
vi.mock('../services/apiService', () => ({
  APIService: {
    extractDocument: vi.fn(),
    generateChaserSMS: vi.fn()
  }
}));

// Mock FileReader
global.FileReader = class FileReader {
  readAsDataURL = vi.fn(function(this: any) {
    // Simulate async file reading
    setTimeout(() => {
      this.result = 'data:image/png;base64,mockBase64Data';
      if (this.onload) {
        this.onload({ target: this });
      }
    }, 0);
  });
  onload: any = null;
  onerror: any = null;
  result: string | null = null;
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('MortgageExtractionResult and extractMortgageDocument', () => {
  let mockGeminiService: any;
  let mockAPIService: any;

  beforeEach(() => {
    mockGeminiService = GeminiService.getInstance();
    mockAPIService = APIService;
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('should extract mortgage document successfully and return MortgageExtractionResult', async () => {
    const mockResult = {
      document_type: 'paystub',
      key_entities: { name: 'John Doe', year_to_date_gross: 50000 },
      discrepancy_alerts: [],
      extraction_confidence: 0.95,
      raw_text_preview: 'Mock text'
    };
    mockAPIService.extractDocument.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useAgent(), { wrapper: AgentProvider });

    let extractionResult: any;
    await act(async () => {
      extractionResult = await result.current.extractMortgageDocument(new File([''], 'test.png'));
    });

    expect(extractionResult).toMatchObject({
      document_type: 'paystub',
      key_entities: expect.any(Object),
      discrepancy_alerts: expect.any(Array),
      extraction_confidence: expect.any(Number),
      raw_text_preview: expect.any(String),
      automated_chaser: undefined
    });
  });

  it('should trigger automated chaser for missing YTD on paystub', async () => {
    const mockResult = {
      document_type: 'paystub',
      key_entities: { name: 'Jane Doe' }, // Missing YTD
      discrepancy_alerts: [],
      extraction_confidence: 0.9,
      raw_text_preview: 'Mock text'
    };
    mockAPIService.extractDocument.mockResolvedValue(mockResult);
    mockAPIService.generateChaserSMS.mockResolvedValue({
      smsTemplate: 'Hi Jane Doe, this is Your mortgage broker. We need your Year-to-Date income total. Please resend!'
    });

    const { result } = renderHook(() => useAgent(), { wrapper: AgentProvider });

    let extractionResult: any;
    await act(async () => {
      extractionResult = await result.current.extractMortgageDocument(new File([''], 'test.png'));
    });

    expect(extractionResult.automated_chaser).toEqual({
      triggered: true,
      reason: 'Missing Year-to-Date (YTD) income total on paystub',
      sms_template: expect.any(String)
    });
  });

  it('should handle extraction errors and return error MortgageExtractionResult', async () => {
    mockAPIService.extractDocument.mockRejectedValue(new Error('Extraction failed'));

    const { result } = renderHook(() => useAgent(), { wrapper: AgentProvider });

    let extractionResult: any;
    await act(async () => {
      extractionResult = await result.current.extractMortgageDocument(new File([''], 'test.png'));
    });

    expect(extractionResult).toMatchObject({
      document_type: 'Error',
      key_entities: {},
      discrepancy_alerts: expect.arrayContaining([
        expect.objectContaining({
          field: 'extraction',
          severity: 'high'
        })
      ]),
      extraction_confidence: 0,
      raw_text_preview: '',
      automated_chaser: undefined
    });
  });

  it('should update UI state (isProcessing) during extraction', async () => {
    mockGeminiService.extractMortgageData.mockResolvedValue({
      document_type: 'paystub',
      key_entities: {},
      discrepancy_alerts: [],
      extraction_confidence: 0.8,
      raw_text_preview: ''
    });

    const { result } = renderHook(() => useAgent(), { wrapper: AgentProvider });

    expect(result.current.isProcessing).toBe(false);

    act(() => {
      result.current.extractMortgageDocument(new File([''], 'test.png'));
    });

    expect(result.current.isProcessing).toBe(true);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.isProcessing).toBe(false);
  });
});