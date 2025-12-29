import { Lead, SystemConfig } from "../types.js";
export declare class GeminiService {
    private static instance;
    private config;
    private constructor();
    static getInstance(config: SystemConfig): GeminiService;
    updateConfig(config: SystemConfig): void;
    private get ai();
    /**
     * THE SPEED AGENT (Live Chat)
     * Uses fast model for sub-second latency.
     * Enables Google Search Grounding if configured.
     */
    chatWithSpeedAgent(history: {
        role: string;
        parts: {
            text: string;
        }[];
    }[], userMessage: string): Promise<{
        content: string;
        citations: (string | undefined)[];
    }>;
    /**
     * DOCUMENT EXTRACTION
     * Extracts structured data from mortgage documents using vision model.
     * Supports PDFs, images (PNG, JPG), and scanned documents.
     */
    extractDocumentData(fileData: string, // base64 encoded file
    mimeType: string, // e.g., 'application/pdf', 'image/jpeg'
    documentType: 'paystub' | 'w2' | 'bank_statement' | '1003' | 'tax_return' | 'other'): Promise<{
        extracted_data: Record<string, any>;
        confidence: number;
        document_type: string;
        warnings: string[];
    }>;
    /**
     * MORTGAGE DATA EXTRACTION WITH DISCREPANCY DETECTION
     * Extracts structured data from mortgage documents and validates against borrower info.
     * Returns document type, key entities, and alerts for discrepancies.
     */
    extractMortgageData(base64Pdf: string, mimeType?: string, expectedBorrowerName?: string): Promise<{
        document_type: string;
        key_entities: {
            name?: string;
            employer?: string;
            total_income?: number;
            total_balance?: number;
            account_number?: string;
            ssn?: string;
            address?: string;
            [key: string]: any;
        };
        discrepancy_alerts: Array<{
            field: string;
            issue: string;
            severity: 'low' | 'medium' | 'high';
        }>;
        extraction_confidence: number;
        raw_text_preview: string;
    }>;
    /**
     * LEAD INTELLIGENCE BOARD (Batch Processor)
     * Uses high-reasoning model for deep analysis.
     * Analyzes urgency and assigns a score (0-100).
     */
    analyzeLeadUrgency(lead: Lead): Promise<{
        score: number;
        analysis: string;
    }>;
}
//# sourceMappingURL=geminiService.d.ts.map