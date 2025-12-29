import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
export class GeminiService {
    static instance;
    config;
    constructor(config) {
        this.config = config;
    }
    static getInstance(config) {
        if (!GeminiService.instance) {
            GeminiService.instance = new GeminiService(config);
        }
        else {
            // Always update config when getInstance is called
            GeminiService.instance.config = config;
        }
        return GeminiService.instance;
    }
    // Added updateConfig to sync service configuration with application state
    updateConfig(config) {
        this.config = config;
    }
    get ai() {
        return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    /**
     * THE SPEED AGENT (Live Chat)
     * Uses fast model for sub-second latency.
     * Enables Google Search Grounding if configured.
     */
    async chatWithSpeedAgent(history, userMessage) {
        console.log('Chat with history:', history, 'userMessage:', userMessage);
        const ai = this.ai;
        const modelToUse = this.config.brain.speedModel || 'gemini-2.0-flash-exp';
        console.log('🚀 Using model:', modelToUse);
        console.log('🔧 Current config:', this.config);
        const model = ai.getGenerativeModel({
            model: modelToUse,
            generationConfig: {
                temperature: 0.7,
            },
            systemInstruction: "You are the SoloScale Speed Agent. Your goal is to qualify leads, provide real-time market data, and be incredibly responsive. Use search grounding for any factual queries about rates, inventory, or market news.",
        });
        const chat = model.startChat({
            history: history
        });
        console.log('Sending message');
        const result = await chat.sendMessage(userMessage);
        console.log('Chat result:', result);
        console.log('Full result:', JSON.stringify(result, null, 2));
        // Extract grounding metadata if it exists
        const groundingChunks = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const citations = groundingChunks
            ?.filter(chunk => chunk.web)
            ?.map(chunk => chunk.web.title || chunk.web.uri) || [];
        return {
            content: result.response.text() || "",
            citations: citations
        };
    }
    /**
     * DOCUMENT EXTRACTION
     * Extracts structured data from mortgage documents using vision model.
     * Supports PDFs, images (PNG, JPG), and scanned documents.
     */
    async extractDocumentData(fileData, // base64 encoded file
    mimeType, // e.g., 'application/pdf', 'image/jpeg'
    documentType) {
        const ai = this.ai;
        // Define extraction schema based on document type
        const schemas = {
            paystub: {
                type: SchemaType.OBJECT,
                properties: {
                    employee_name: { type: SchemaType.STRING },
                    employer_name: { type: SchemaType.STRING },
                    pay_period_start: { type: SchemaType.STRING },
                    pay_period_end: { type: SchemaType.STRING },
                    gross_pay: { type: SchemaType.NUMBER },
                    net_pay: { type: SchemaType.NUMBER },
                    year_to_date_gross: { type: SchemaType.NUMBER },
                    deductions: { type: SchemaType.OBJECT }
                },
                required: ["employee_name", "employer_name", "gross_pay"]
            },
            w2: {
                type: SchemaType.OBJECT,
                properties: {
                    employee_name: { type: SchemaType.STRING },
                    employee_ssn: { type: SchemaType.STRING },
                    employer_name: { type: SchemaType.STRING },
                    employer_ein: { type: SchemaType.STRING },
                    wages: { type: SchemaType.NUMBER },
                    federal_tax_withheld: { type: SchemaType.NUMBER },
                    social_security_wages: { type: SchemaType.NUMBER },
                    tax_year: { type: SchemaType.NUMBER }
                },
                required: ["employee_name", "employer_name", "wages", "tax_year"]
            },
            bank_statement: {
                type: SchemaType.OBJECT,
                properties: {
                    account_holder_name: { type: SchemaType.STRING },
                    bank_name: { type: SchemaType.STRING },
                    account_number_last4: { type: SchemaType.STRING },
                    statement_period_start: { type: SchemaType.STRING },
                    statement_period_end: { type: SchemaType.STRING },
                    beginning_balance: { type: SchemaType.NUMBER },
                    ending_balance: { type: SchemaType.NUMBER },
                    total_deposits: { type: SchemaType.NUMBER },
                    total_withdrawals: { type: SchemaType.NUMBER }
                },
                required: ["account_holder_name", "bank_name", "ending_balance"]
            },
            other: {
                type: SchemaType.OBJECT,
                properties: {
                    document_title: { type: SchemaType.STRING },
                    key_information: { type: SchemaType.OBJECT }
                }
            }
        };
        const schema = schemas[documentType] || schemas.other;
        const prompt = `You are a mortgage document processing assistant. Extract all relevant information from this ${documentType} document.

IMPORTANT INSTRUCTIONS:
1. Extract data accurately from the document
2. For monetary values, use numbers without currency symbols
3. For dates, use YYYY-MM-DD format
4. If a field is not found, omit it from the response
5. Include a confidence score (0-100) based on document quality
6. List any warnings about missing or unclear information

Return the data in the exact JSON schema provided.`;
        try {
            const model = ai.getGenerativeModel({
                model: 'gemini-2.0-flash-exp', // Use vision-capable model
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            extracted_data: schema,
                            confidence: { type: SchemaType.NUMBER, description: "Confidence score 0-100" },
                            document_type: { type: SchemaType.STRING },
                            warnings: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING },
                                description: "List of warnings about data quality or missing fields"
                            }
                        },
                        required: ["extracted_data", "confidence", "document_type"]
                    }
                }
            });
            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        data: fileData,
                        mimeType: mimeType
                    }
                }
            ]);
            const text = result.response.text() || "{}";
            const parsed = JSON.parse(text);
            return {
                extracted_data: parsed.extracted_data || {},
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
                document_type: parsed.document_type || documentType,
                warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
            };
        }
        catch (error) {
            console.error("Document Extraction Error:", error);
            return {
                extracted_data: {},
                confidence: 0,
                document_type: documentType,
                warnings: ["Failed to extract data from document"]
            };
        }
    }
    /**
     * MORTGAGE DATA EXTRACTION WITH DISCREPANCY DETECTION
     * Extracts structured data from mortgage documents and validates against borrower info.
     * Returns document type, key entities, and alerts for discrepancies.
     */
    async extractMortgageData(base64Pdf, mimeType = 'application/pdf', expectedBorrowerName) {
        const ai = this.ai;
        const prompt = `You are an expert mortgage underwriter reviewing a document for loan approval.

TASK: Extract structured data from this mortgage document and identify any discrepancies.

${expectedBorrowerName ? `EXPECTED BORROWER NAME: "${expectedBorrowerName}"` : ''}

EXTRACT THE FOLLOWING:
1. Document Type (e.g., "Bank Statement", "Paystub", "W-2", "Tax Return", "1003 Form")
2. Key Entities:
   - Full name of applicant/account holder
   - Employer name (if present)
   - Total income or total balance (depending on document type)
   - Account number (if present, last 4 digits only)
   - SSN (if present, last 4 digits only)
   - Address (if present)
   - Any other relevant financial information

3. Discrepancy Alerts:
   - If name doesn't match expected borrower name
   - If income/balance seems unusually high or low
   - If document appears altered or low quality
   - If required fields are missing
   - If dates are inconsistent

4. Confidence Score (0-100) based on:
   - Document quality/readability
   - Completeness of data
   - Presence of required fields

5. Raw Text Preview (first 200 characters of extracted text)

IMPORTANT:
- For monetary values, use numbers without currency symbols or commas
- Flag any discrepancies with appropriate severity (low/medium/high)
- If name doesn't match expected borrower, this is HIGH severity
- Missing critical fields is MEDIUM severity
- Quality issues are LOW severity`;
        try {
            const model = ai.getGenerativeModel({
                model: 'gemini-2.0-flash-exp', // Use vision-capable model
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            document_type: {
                                type: SchemaType.STRING,
                                description: "Type of document (e.g., Bank Statement, Paystub, W-2)"
                            },
                            key_entities: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    name: { type: SchemaType.STRING },
                                    employer: { type: SchemaType.STRING },
                                    total_income: { type: SchemaType.NUMBER },
                                    total_balance: { type: SchemaType.NUMBER },
                                    account_number: { type: SchemaType.STRING },
                                    ssn: { type: SchemaType.STRING },
                                    address: { type: SchemaType.STRING }
                                },
                                description: "Key entities extracted from document"
                            },
                            discrepancy_alerts: {
                                type: SchemaType.ARRAY,
                                items: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        field: { type: SchemaType.STRING },
                                        issue: { type: SchemaType.STRING },
                                        severity: { type: SchemaType.STRING }
                                    },
                                    required: ["field", "issue", "severity"]
                                },
                                description: "List of discrepancies or issues found (severity: low, medium, or high)"
                            },
                            extraction_confidence: {
                                type: SchemaType.NUMBER,
                                description: "Confidence score 0-100"
                            },
                            raw_text_preview: {
                                type: SchemaType.STRING,
                                description: "First 200 characters of extracted text"
                            }
                        },
                        required: ["document_type", "key_entities", "discrepancy_alerts", "extraction_confidence", "raw_text_preview"]
                    }
                }
            });
            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        data: base64Pdf,
                        mimeType: mimeType
                    }
                }
            ]);
            const text = result.response.text() || "{}";
            const parsed = JSON.parse(text);
            return {
                document_type: parsed.document_type || "Unknown",
                key_entities: parsed.key_entities || {},
                discrepancy_alerts: Array.isArray(parsed.discrepancy_alerts) ? parsed.discrepancy_alerts : [],
                extraction_confidence: typeof parsed.extraction_confidence === 'number' ? parsed.extraction_confidence : 0,
                raw_text_preview: parsed.raw_text_preview || ""
            };
        }
        catch (error) {
            console.error("Mortgage Data Extraction Error:", error);
            return {
                document_type: "Error",
                key_entities: {},
                discrepancy_alerts: [{
                        field: "extraction",
                        issue: "Failed to extract data from document: " + error.message,
                        severity: "high"
                    }],
                extraction_confidence: 0,
                raw_text_preview: ""
            };
        }
    }
    /**
     * LEAD INTELLIGENCE BOARD (Batch Processor)
     * Uses high-reasoning model for deep analysis.
     * Analyzes urgency and assigns a score (0-100).
     */
    async analyzeLeadUrgency(lead) {
        const ai = this.ai;
        const prompt = `
      Act as a Senior Mortgage Underwriter. Analyze this lead and determine their urgency to purchase or refinance.
      
      LEAD CONTENT: "${lead.content}"
      SOURCE: "${lead.rawSource}"
      
      Determine an urgency score (0-100) and provide a one-sentence summary of your analysis.
    `;
        try {
            const model = ai.getGenerativeModel({
                model: this.config.brain.reasoningModel || 'gemini-2.0-flash-exp',
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            score: { type: SchemaType.NUMBER, description: "Integer 0-100 based on intent to buy now" },
                            analysis: { type: SchemaType.STRING, description: "1 sentence summary of why" }
                        },
                        required: ["score", "analysis"]
                    }
                }
            });
            const result = await model.generateContent(prompt);
            const text = result.response.text() || "{}";
            const parsed = JSON.parse(text);
            return {
                score: typeof parsed.score === 'number' ? parsed.score : 0,
                analysis: parsed.analysis || "Could not generate analysis summary."
            };
        }
        catch (error) {
            console.error("Lead Analysis Error:", error);
            return { score: 0, analysis: "AI Analysis engine encountered an error." };
        }
    }
}
//# sourceMappingURL=geminiService.js.map