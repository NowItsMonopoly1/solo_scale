import { Queue } from 'bullmq';
// import { db } from '../db/client.js';
// import { GeminiService } from '../../../services/geminiService.js';
// import { MessagingService } from '../services/messaging/messagingService.js';

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
};

// interface DocumentProcessingJob {
//   leadId: string;
//   accountId: string;
//   userId: string;
//   fileData: string; // base64
//   mimeType: string;
//   expectedBorrowerName?: string;
//   clientName?: string;
//   brokerName?: string;
//   clientPhone?: string;
//   clientEmail?: string;
// }

/**
 * Create the document processing queue
 */
let documentQueue: Queue | null = null;
try {
  documentQueue = new Queue('document-processing', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: {
        count: 100, // Keep last 100 completed jobs
        age: 24 * 3600 // Remove after 24 hours
      },
      removeOnFail: {
        count: 500 // Keep last 500 failed jobs for debugging
      }
    }
  });
} catch (error) {
  console.warn('Redis not available, document processing queue disabled:', error.message);
}

export { documentQueue };

/**
 * Background worker that processes document extraction jobs
 */
let documentWorker: any = null;
// Worker disabled due to Redis dependency
// if (documentQueue) {
//   try {
//     documentWorker = new Worker<DocumentProcessingJob>(
//       'document-processing',
//       async (job: Job<DocumentProcessingJob>) => {
//         // ... job processing code ...
//       },
//       {
//         connection: redisConnection,
//         concurrency: 5, // Process 5 documents concurrently
//         limiter: {
//           max: 20, // Max 20 jobs per duration
//           duration: 60000 // Per minute
//         }
//       }
//     );
//   } catch (error) {
//     console.warn('Failed to create document worker:', error.message);
//   }
// }

export { documentWorker };
// async function updateLeadStatus(
//   leadId: string,
//   accountId: string,
//   status: 'pending' | 'processing' | 'completed' | 'needs_review' | 'failed',
//   metadata: Record<string, any>
// ): Promise<void> {
//   await db.query(
//     `UPDATE leads
//      SET status = $1, metadata = metadata || $2::jsonb, updated_at = NOW()
//      WHERE id = $3 AND account_id = $4`,
//     [status, JSON.stringify(metadata), leadId, accountId]
//   );
// }

// /**
//  * Generate chaser SMS (fallback if GeminiService not accessible)
//  */
// async function generateChaserSMS(
//   clientName: string,
//   brokerName: string,
//   missingField: string
// ): Promise<string> {
//   return `Hi ${clientName}, this is ${brokerName}. We need your complete paystub with ${missingField} to proceed. Can you resend? Thanks!`;
// }

/**
 * Event handlers for monitoring
 */
if (documentWorker) {
  documentWorker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed for lead ${job.data.leadId}`);
  });

  documentWorker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  documentWorker.on('progress', (job, progress) => {
    console.log(`[Worker] Job ${job.id} progress:`, progress);
  });

  /**
   * Graceful shutdown
   */
  process.on('SIGTERM', async () => {
    console.log('[Worker] SIGTERM received, shutting down gracefully');
    await documentWorker.close();
    if (documentQueue) await documentQueue.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[Worker] SIGINT received, shutting down gracefully');
    await documentWorker.close();
    if (documentQueue) await documentQueue.close();
    process.exit(0);
  });

  console.log('[Worker] Document processing worker started');
}
