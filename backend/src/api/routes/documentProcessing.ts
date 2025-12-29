import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { documentQueue } from '../../workers/documentWorker.js';
import { db } from '../../db/client.js';

interface DocumentUploadBody {
  leadId: string;
  fileData: string; // base64
  mimeType: string;
  expectedBorrowerName?: string;
  clientName?: string;
  brokerName?: string;
  clientPhone?: string;
  clientEmail?: string;
}

interface JobStatusParams {
  jobId: string;
}

/**
 * Document Processing Routes
 * Handles background job queuing and status polling
 */
export async function documentProcessingRoutes(fastify: FastifyInstance) {

  /**
   * POST /api/documents/process
   * Queue a document for background processing
   */
  fastify.post<{ Body: DocumentUploadBody }>(
    '/api/documents/process',
    {
      schema: {
        description: 'Queue document for AI extraction (background processing)',
        tags: ['Documents'],
        body: {
          type: 'object',
          required: ['leadId', 'fileData', 'mimeType'],
          properties: {
            leadId: { type: 'string' },
            fileData: { type: 'string', description: 'Base64-encoded file' },
            mimeType: { type: 'string', enum: ['application/pdf', 'image/jpeg', 'image/png'] },
            expectedBorrowerName: { type: 'string' },
            clientName: { type: 'string' },
            brokerName: { type: 'string' },
            clientPhone: { type: 'string' },
            clientEmail: { type: 'string', format: 'email' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              jobId: { type: 'string' },
              message: { type: 'string' },
              statusUrl: { type: 'string' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: DocumentUploadBody }>, reply: FastifyReply) => {
      const user = request.user; // From JWT middleware
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { leadId, fileData, mimeType, expectedBorrowerName, clientName, brokerName, clientPhone, clientEmail } = request.body;

      try {
        // Check if document processing is available
        if (!documentQueue) {
          return reply.code(503).send({ error: 'Document processing unavailable - Redis not configured' });
        }

        // Validate lead exists and belongs to user's account
        const leadCheck = await db.query(
          'SELECT id FROM leads WHERE id = $1 AND account_id = $2',
          [leadId, (user as any).accountId]
        );

        if (leadCheck.rows.length === 0) {
          return reply.code(404).send({ error: 'Lead not found or access denied' });
        }

        // Add job to queue
        const job = await documentQueue.add('extract-mortgage-data', {
          leadId,
          accountId: (user as any).accountId,
          userId: (user as any).id,
          fileData,
          mimeType,
          expectedBorrowerName,
          clientName,
          brokerName,
          clientPhone,
          clientEmail
        }, {
          jobId: `doc_${leadId}_${Date.now()}`,
          priority: expectedBorrowerName ? 1 : 5 // Higher priority if name validation needed
        });

        // Log job submission to audit
        await db.query(
          `INSERT INTO audit_logs (account_id, user_id, action, resource_type, resource_id, metadata, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            (user as any).accountId,
            (user as any).id,
            'document.queued',
            'lead',
            leadId,
            JSON.stringify({ jobId: job.id, mimeType })
          ]
        );

        return reply.send({
          success: true,
          jobId: job.id!,
          message: 'Document queued for processing',
          statusUrl: `/api/documents/status/${job.id}`
        });
      } catch (error) {
        fastify.log.error(`Document queue error: ${(error as Error).message}`);
        return reply.code(500).send({ error: 'Failed to queue document for processing' });
      }
    }
  );

  /**
   * GET /api/documents/status/:jobId
   * Poll job status (non-blocking)
   */
  fastify.get<{ Params: JobStatusParams }>(
    '/api/documents/status/:jobId',
    {
      schema: {
        description: 'Get document processing job status',
        tags: ['Documents'],
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
              status: { type: 'string', enum: ['waiting', 'active', 'completed', 'failed'] },
              progress: { type: 'number' },
              result: { type: 'object', additionalProperties: true },
              error: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              processedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: JobStatusParams }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { jobId } = request.params;

      try {
        if (!documentQueue) {
          return reply.code(503).send({ error: 'Document processing unavailable - Redis not configured' });
        }

        const job = await documentQueue.getJob(jobId);

        if (!job) {
          return reply.code(404).send({ error: 'Job not found' });
        }

        // Verify job belongs to user's account
        if (job.data.accountId !== (user as any).accountId) {
          return reply.code(403).send({ error: 'Access denied' });
        }

        const state = await job.getState();
        const progress = job.progress;
        const isCompleted = await job.isCompleted();
        const isFailed = await job.isFailed();

        let result = null;
        let error = null;

        if (isCompleted) {
          result = job.returnvalue;
        } else if (isFailed) {
          error = job.failedReason;
        }

        return reply.send({
          jobId: job.id,
          status: state,
          progress: typeof progress === 'number' ? progress : 0,
          result,
          error,
          createdAt: new Date(job.timestamp).toISOString(),
          processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null
        });
      } catch (error) {
        fastify.log.error(`Job status error: ${(error as Error).message}`);
        return reply.code(500).send({ error: 'Failed to retrieve job status' });
      }
    }
  );

  /**
   * GET /api/documents/history/:leadId
   * Get document extraction history for a lead
   */
  fastify.get<{ Params: { leadId: string } }>(
    '/api/documents/history/:leadId',
    {
      schema: {
        description: 'Get document extraction history for a lead',
        tags: ['Documents'],
        params: {
          type: 'object',
          properties: {
            leadId: { type: 'string' }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Params: { leadId: string } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { leadId } = request.params;

      try {
        const result = await db.query(
          `SELECT
            id, document_type, key_entities, discrepancy_alerts,
            extraction_confidence, raw_text_preview, automated_chaser_sent, created_at
           FROM document_extractions
           WHERE lead_id = $1 AND account_id = $2
           ORDER BY created_at DESC
           LIMIT 50`,
          [leadId, (user as any).accountId]
        );

        return reply.send({
          leadId,
          extractions: result.rows.map(row => ({
            id: row.id,
            documentType: row.document_type,
            keyEntities: row.key_entities,
            discrepancyAlerts: row.discrepancy_alerts,
            extractionConfidence: row.extraction_confidence,
            rawTextPreview: row.raw_text_preview,
            automatedChaserSent: row.automated_chaser_sent,
            createdAt: row.created_at
          }))
        });
      } catch (error) {
        fastify.log.error(`Document history error: ${(error as Error).message}`);
        return reply.code(500).send({ error: 'Failed to retrieve document history' });
      }
    }
  );

  /**
   * POST /api/documents/batch-process
   * Queue multiple documents for batch processing
   */
  fastify.post<{ Body: { documents: DocumentUploadBody[] } }>(
    '/api/documents/batch-process',
    {
      schema: {
        description: 'Queue multiple documents for batch processing',
        tags: ['Documents'],
        body: {
          type: 'object',
          required: ['documents'],
          properties: {
            documents: {
              type: 'array',
              items: {
                type: 'object',
                required: ['leadId', 'fileData', 'mimeType'],
                properties: {
                  leadId: { type: 'string' },
                  fileData: { type: 'string' },
                  mimeType: { type: 'string' },
                  expectedBorrowerName: { type: 'string' },
                  clientName: { type: 'string' },
                  brokerName: { type: 'string' },
                  clientPhone: { type: 'string' },
                  clientEmail: { type: 'string' }
                }
              },
              maxItems: 50 // Limit batch size
            }
          }
        }
      }
    },
    async (request: FastifyRequest<{ Body: { documents: DocumentUploadBody[] } }>, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const { documents } = request.body;

      try {
        const jobs = await Promise.all(
          documents.map(doc =>
            documentQueue.add('extract-mortgage-data', {
              ...doc,
              accountId: (user as any).accountId,
              userId: (user as any).id
            }, {
              jobId: `doc_${doc.leadId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            })
          )
        );

        return reply.send({
          success: true,
          message: `Queued ${jobs.length} documents for processing`,
          jobIds: jobs.map(j => j.id),
          batchId: `batch_${Date.now()}`
        });
      } catch (error) {
        fastify.log.error(`Batch queue error: ${(error as Error).message}`);
        return reply.code(500).send({ error: 'Failed to queue documents for batch processing' });
      }
    }
  );
}
