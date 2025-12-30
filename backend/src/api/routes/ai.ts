import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { config } from '../../config/index.js';
import { createRateLimitMiddleware, RateLimitPresets } from '../../middleware/rateLimit.js';

interface ExtractDocumentBody {
  fileData: string; // base64
  mimeType: string;
  expectedBorrowerName?: string;
}

interface ChatBody {
  history: Array<{ role: string; parts: Array<{ text: string }> }>;
  message: string;
  modelToUse?: string;
}

/**
 * AI Routes - Secure Backend Proxy for Gemini API
 * Prevents API key exposure in frontend code
 */
export async function aiRoutes(fastify: FastifyInstance) {
  // Initialize Gemini client (server-side only)
  const ai = new GoogleGenerativeAI(config.ai.geminiApiKey);

  /**
   * POST /ai/extract-document
   * Extract structured mortgage data from document
   */
  fastify.post<{ Body: ExtractDocumentBody }>(
    '/ai/extract-document',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.ai),
      schema: {
        description: 'Extract mortgage data from document using AI',
        tags: ['AI'],
        body: {
          type: 'object',
          required: ['fileData', 'mimeType'],
          properties: {
            fileData: {
              type: 'string',
              description: 'Base64 encoded file data'
            },
            mimeType: {
              type: 'string',
              description: 'File MIME type (e.g., application/pdf, image/jpeg)'
            },
            expectedBorrowerName: {
              type: 'string',
              description: 'Expected borrower name for discrepancy detection'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              document_type: { type: 'string' },
              key_entities: { type: 'object' },
              discrepancy_alerts: { type: 'array' },
              extraction_confidence: { type: 'number' },
              raw_text_preview: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: ExtractDocumentBody }>, reply: FastifyReply) => {
      const { fileData, mimeType, expectedBorrowerName } = request.body;

      try {
        const prompt = `You are an expert mortgage underwriter reviewing a document for loan approval.

TASK: Extract structured data from this mortgage document and identify any discrepancies.

${expectedBorrowerName ? `EXPECTED BORROWER NAME: "${expectedBorrowerName}"` : ''}

EXTRACT THE FOLLOWING:
1. Document Type (e.g., "Bank Statement", "Paystub", "W-2", "Tax Return", "1003 Form")
2. Key Entities:
   - Full name of applicant/account holder
   - Employer name (if present)
   - Total income or total balance (depending on document type)
   - Year-to-Date income (for paystubs)
   - Account number (if present, last 4 digits only)
   - SSN (if present, last 4 digits only)
   - Address (if present)
   - Any other relevant financial information

3. Discrepancy Alerts:
   - If name doesn't match expected borrower name
   - If income/balance seems unusually high or low
   - If document appears altered or low quality
   - If required fields are missing (especially YTD for paystubs)
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
- Missing critical fields (like YTD on paystub) is MEDIUM severity
- Quality issues are LOW severity`;

        const model = ai.getGenerativeModel({
          model: 'gemini-2.0-flash-exp',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                document_type: {
                  type: SchemaType.STRING,
                  description: 'Type of document (e.g., Bank Statement, Paystub, W-2)'
                },
                key_entities: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING },
                    employer: { type: SchemaType.STRING },
                    total_income: { type: SchemaType.NUMBER },
                    year_to_date_gross: { type: SchemaType.NUMBER },
                    ytd_gross: { type: SchemaType.NUMBER },
                    year_to_date: { type: SchemaType.NUMBER },
                    total_balance: { type: SchemaType.NUMBER },
                    account_number: { type: SchemaType.STRING },
                    ssn: { type: SchemaType.STRING },
                    address: { type: SchemaType.STRING }
                  },
                  description: 'Key entities extracted from document'
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
                    required: ['field', 'issue', 'severity']
                  },
                  description: 'List of discrepancies or issues found (severity: low, medium, or high)'
                },
                extraction_confidence: {
                  type: SchemaType.NUMBER,
                  description: 'Confidence score 0-100'
                },
                raw_text_preview: {
                  type: SchemaType.STRING,
                  description: 'First 200 characters of extracted text'
                }
              },
              required: ['document_type', 'key_entities', 'discrepancy_alerts', 'extraction_confidence', 'raw_text_preview']
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

        const text = result.response.text() || '{}';
        const parsed = JSON.parse(text);

        return reply.send({
          document_type: parsed.document_type || 'Unknown',
          key_entities: parsed.key_entities || {},
          discrepancy_alerts: Array.isArray(parsed.discrepancy_alerts) ? parsed.discrepancy_alerts : [],
          extraction_confidence: typeof parsed.extraction_confidence === 'number' ? parsed.extraction_confidence : 0,
          raw_text_preview: parsed.raw_text_preview || ''
        });

      } catch (error) {
        fastify.log.error(`AI extraction error: ${(error as Error).message}`);
        return reply.code(500).send({
          document_type: 'Error',
          key_entities: {},
          discrepancy_alerts: [{
            field: 'extraction',
            issue: `Failed to extract data: ${(error as Error).message}`,
            severity: 'high'
          }],
          extraction_confidence: 0,
          raw_text_preview: ''
        });
      }
    }
  );

  /**
   * POST /ai/extract-general-document
   * Extract structured data from general document types
   */
  fastify.post<{ Body: { fileData: string; mimeType: string; documentType: string } }>(
    '/ai/extract-general-document',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.ai),
      schema: {
        description: 'Extract data from general documents (paystub, W-2, bank statement, etc.)',
        tags: ['AI'],
        body: {
          type: 'object',
          required: ['fileData', 'mimeType', 'documentType'],
          properties: {
            fileData: { type: 'string', description: 'Base64 encoded file data' },
            mimeType: { type: 'string', description: 'File MIME type' },
            documentType: {
              type: 'string',
              enum: ['paystub', 'w2', 'bank_statement', '1003', 'tax_return', 'other'],
              description: 'Type of document to extract'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              extracted_data: { type: 'object' },
              confidence: { type: 'number' },
              document_type: { type: 'string' },
              warnings: { type: 'array', items: { type: 'string' } }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { fileData, mimeType, documentType } = request.body;

      try {
        const model = ai.getGenerativeModel({
          model: 'gemini-2.0-flash-exp',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                extracted_data: {
                  type: SchemaType.OBJECT,
                  description: 'Extracted data fields',
                  properties: {}
                },
                confidence: {
                  type: SchemaType.NUMBER,
                  description: 'Confidence score 0-100'
                },
                document_type: {
                  type: SchemaType.STRING,
                  description: 'Detected document type'
                },
                warnings: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                  description: 'List of warnings or issues'
                }
              },
              required: ['extracted_data', 'confidence', 'document_type', 'warnings']
            }
          }
        });

        const prompt = `Extract structured data from this ${documentType} document.

TASK: Extract relevant fields based on the document type.

FOR PAYSTUBS:
- Employee name, employer, pay period, gross pay, net pay, YTD totals, deductions

FOR W-2:
- Employee name, employer name, wages, federal tax withheld, state tax, box values

FOR BANK STATEMENTS:
- Account holder name, account number (last 4), balance, transaction summary

FOR 1003 FORMS:
- Borrower info, loan details, property address, income, assets

FOR TAX RETURNS:
- Name, filing status, AGI, total income, taxable income

Return a confidence score (0-100) and any warnings about missing data or quality issues.`;

        const result = await model.generateContent([
          { text: prompt },
          { inlineData: { data: fileData, mimeType } }
        ]);

        const extracted = JSON.parse(result.response.text());

        return reply.send(extracted);
      } catch (error: any) {
        fastify.log.error({ error }, 'General document extraction error');
        return reply.code(500).send({
          extracted_data: {},
          confidence: 0,
          document_type: documentType,
          warnings: ['Failed to extract document: ' + error.message]
        });
      }
    }
  );

  /**
   * POST /ai/chat
   * Chat with Speed Agent (with Google Search grounding)
   */
  fastify.post<{ Body: ChatBody }>(
    '/ai/chat',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.ai),
      schema: {
        description: 'Chat with AI Speed Agent',
        tags: ['AI'],
        body: {
          type: 'object',
          required: ['history', 'message'],
          properties: {
            history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string' },
                  parts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        text: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            message: { type: 'string' },
            modelToUse: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: ChatBody }>, reply: FastifyReply) => {
      const { history, message, modelToUse } = request.body;

      try {
        const model = ai.getGenerativeModel({
          model: modelToUse || 'gemini-2.0-flash-exp',
          generationConfig: {
            temperature: 0.7,
          }
        });

        const chat = model.startChat({
          history: history
        });

        const systemPrompt = 'You are the SoloScale Speed Agent. Your goal is to qualify leads, provide real-time market data, and be incredibly responsive. Use search grounding for any factual queries about rates, inventory, or market news.\n\n';
        const fullMessage = systemPrompt + message;

        const result = await chat.sendMessage(fullMessage);

        // Extract grounding metadata if it exists
        const groundingChunks = result.response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const citations = groundingChunks
          ?.filter(chunk => chunk.web)
          ?.map(chunk => chunk.web!.title || chunk.web!.uri) || [];

        return reply.send({
          content: result.response.text() || '',
          citations: citations
        });

      } catch (error) {
        fastify.log.error(`AI chat error: ${(error as Error).message}`);
        return reply.code(500).send({
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          citations: []
        });
      }
    }
  );

  /**
   * POST /ai/analyze-lead-urgency
   * Analyze lead urgency score
   */
  fastify.post<{ Body: { content: string; rawSource: string; reasoningModel?: string } }>(
    '/ai/analyze-lead-urgency',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.ai),
      schema: {
        description: 'Analyze lead urgency using AI',
        tags: ['AI'],
        body: {
          type: 'object',
          required: ['content', 'rawSource'],
          properties: {
            content: { type: 'string' },
            rawSource: { type: 'string' },
            reasoningModel: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { content, rawSource, reasoningModel } = request.body;

      try {
        const prompt = `
Act as a Senior Mortgage Underwriter. Analyze this lead and determine their urgency to purchase or refinance.

LEAD CONTENT: "${content}"
SOURCE: "${rawSource}"

Determine an urgency score (0-100) and provide a one-sentence summary of your analysis.
        `;

        const model = ai.getGenerativeModel({
          model: reasoningModel || 'gemini-2.0-flash-exp',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                score: { type: SchemaType.NUMBER, description: 'Integer 0-100 based on intent to buy now' },
                analysis: { type: SchemaType.STRING, description: '1 sentence summary of why' }
              },
              required: ['score', 'analysis']
            }
          }
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text() || '{}';
        const parsed = JSON.parse(text);

        return reply.send({
          score: typeof parsed.score === 'number' ? parsed.score : 0,
          analysis: parsed.analysis || 'Could not generate analysis summary.'
        });

      } catch (error) {
        fastify.log.error(`Lead analysis error: ${(error as Error).message}`);
        return reply.send({
          score: 0,
          analysis: 'AI Analysis engine encountered an error.'
        });
      }
    }
  );

  /**
   * POST /ai/generate-chaser-sms
   * Generate automated chaser SMS template
   */
  fastify.post<{ Body: { clientName: string; brokerName: string; missingField: string } }>(
    '/ai/generate-chaser-sms',
    {
      preHandler: createRateLimitMiddleware(RateLimitPresets.ai),
      schema: {
        description: 'Generate automated chaser SMS',
        tags: ['AI'],
        body: {
          type: 'object',
          required: ['clientName', 'brokerName', 'missingField'],
          properties: {
            clientName: { type: 'string' },
            brokerName: { type: 'string' },
            missingField: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { clientName, brokerName, missingField } = request.body;

      try {
        const prompt = `Generate a professional, polite SMS to a mortgage applicant asking for a missing document field.

CLIENT NAME: ${clientName}
BROKER NAME: ${brokerName}
MISSING FIELD: ${missingField}

REQUIREMENTS:
- Keep it under 160 characters (SMS length)
- Be friendly and professional
- Include the missing field name
- Add a sense of urgency without being pushy
- Sign off with broker name

Return ONLY the SMS text, no quotes or additional formatting.`;

        const model = ai.getGenerativeModel({
          model: 'gemini-2.0-flash-exp',
          generationConfig: {
            temperature: 0.8,
          }
        });

        const result = await model.generateContent(prompt);
        const smsTemplate = result.response.text()?.trim() ||
          `Hi ${clientName}, we need ${missingField} to proceed with your application. Can you resend the complete document? Thanks! - ${brokerName}`;

        return reply.send({ smsTemplate });

      } catch (error) {
        fastify.log.error(`SMS generation error: ${(error as Error).message}`);
        return reply.send({
          smsTemplate: `Hi ${clientName}, we need ${missingField} to proceed with your application. Can you resend the complete document? Thanks! - ${brokerName}`
        });
      }
    }
  );
}
