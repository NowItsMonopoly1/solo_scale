import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Loader2, Copy, MessageSquare } from 'lucide-react';
import { useAgent, MortgageExtractionResult } from '../contexts/AgentContext';

interface DocumentUploaderProps {
  expectedBorrowerName?: string;
  clientName?: string;
  brokerName?: string;
  onApprove?: (data: MortgageExtractionResult) => void;
  onReject?: (data: MortgageExtractionResult) => void;
}

export function DocumentUploader({
  expectedBorrowerName,
  clientName,
  brokerName,
  onApprove,
  onReject
}: DocumentUploaderProps) {
  const { extractMortgageDocument, user } = useAgent();
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<MortgageExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setExtractedData(null);
    setUploadedFile(file);

    try {
      // SECURITY: Validate file size (10MB max)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // SECURITY: Validate file type
      const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.');
      }

      // SECURITY: Validate file content (magic numbers / file headers)
      const isValidContent = await validateFileContent(file);
      if (!isValidContent) {
        throw new Error('File content does not match declared type. Possible file manipulation detected.');
      }

      // Extract mortgage data with automated chaser logic
      const result = await extractMortgageDocument(
        file,
        expectedBorrowerName,
        clientName,
        brokerName || user?.name
      );

      setExtractedData(result);

      // Log automated chaser if triggered
      if (result.automated_chaser?.triggered) {
        console.log('🤖 Automated Chaser Triggered:', result.automated_chaser.reason);
        console.log('📱 SMS Template:', result.automated_chaser.sms_template);
      }
    } catch (err) {
      console.error('Document processing error:', err);
      setError((err as Error).message || 'Failed to process document');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * SECURITY: Validate file content by checking magic numbers (file headers)
   * Prevents file type spoofing attacks
   */
  const validateFileContent = async (file: File): Promise<boolean> => {
    try {
      // Read first 4 bytes of file
      const buffer = await file.slice(0, 4).arrayBuffer();
      const arr = new Uint8Array(buffer);
      const header = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

      // Check magic numbers for allowed file types
      const isPDF = header.startsWith('25504446'); // %PDF
      const isJPEG = header.startsWith('ffd8ff');
      const isPNG = header.startsWith('89504e47'); // PNG signature

      return isPDF || isJPEG || isPNG;
    } catch (error) {
      console.error('File content validation error:', error);
      return false;
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(f =>
      f.type === 'application/pdf' ||
      f.type.startsWith('image/')
    );

    if (validFile) {
      await processFile(validFile);
    } else {
      setError('Please upload a PDF or image file');
    }
  }, [expectedBorrowerName, clientName, brokerName]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleApprove = () => {
    if (extractedData && onApprove) {
      onApprove(extractedData);
    }
  };

  const handleReject = () => {
    if (extractedData && onReject) {
      onReject(extractedData);
    }
  };

  const copyToClipboard = () => {
    if (extractedData) {
      navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
    }
  };

  const copySMSTemplate = () => {
    if (extractedData?.automated_chaser?.sms_template) {
      navigator.clipboard.writeText(extractedData.automated_chaser.sms_template);
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return <XCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!extractedData && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-white hover:border-blue-400'
          }`}
        >
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isAnalyzing}
            aria-label="Upload document"
          />

          <div className="flex flex-col items-center gap-4">
            {isAnalyzing ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">AI is analyzing document...</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Extracting key entities and checking for discrepancies
                  </p>
                </div>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-slate-400" />
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">
                    Drop mortgage document here
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    or click to browse • PDF, JPG, PNG supported
                  </p>
                </div>
              </>
            )}
          </div>

          {uploadedFile && !isAnalyzing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600">
              <FileText className="w-4 h-4" />
              {uploadedFile.name}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-900">Extraction Failed</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Automated Chaser Alert */}
      {extractedData?.automated_chaser?.triggered && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-xl">
              <MessageSquare className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-black text-amber-900">🤖 Automated Chaser Triggered</h3>
              </div>
              <p className="text-sm text-amber-800 mb-3">
                <span className="font-bold">Reason:</span> {extractedData.automated_chaser.reason}
              </p>

              <div className="bg-white border border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Generated SMS Template
                  </p>
                  <button
                    type="button"
                    onClick={copySMSTemplate}
                    className="flex items-center gap-1 px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Copy SMS
                  </button>
                </div>
                <p className="text-sm text-slate-900 font-medium leading-relaxed">
                  "{extractedData.automated_chaser.sms_template}"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review & Approve Section */}
      {extractedData && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Review & Approve</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Verify extracted data before processing
                </p>
              </div>
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span className="text-sm font-bold">Copy JSON</span>
              </button>
            </div>

            {/* Confidence Score */}
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Confidence Score
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {extractedData.extraction_confidence}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      extractedData.extraction_confidence >= 90
                        ? 'bg-emerald-600'
                        : extractedData.extraction_confidence >= 70
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${extractedData.extraction_confidence}%` }}
                  />
                </div>
              </div>
              <div className="px-4 py-2 bg-slate-200 rounded-lg">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  {extractedData.document_type}
                </p>
              </div>
            </div>
          </div>

          {/* Discrepancy Alerts */}
          {extractedData.discrepancy_alerts.length > 0 && (
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                Discrepancy Alerts
              </h3>
              <div className="space-y-2">
                {extractedData.discrepancy_alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(
                      alert.severity
                    )}`}
                  >
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1">
                      <p className="font-bold text-sm capitalize">{alert.field}</p>
                      <p className="text-xs mt-0.5">{alert.issue}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                      {alert.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Data Table */}
          <div className="p-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
              Extracted Information
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">
                      Field
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.entries(extractedData.key_entities).map(([key, value]) => {
                    if (value === undefined || value === null) return null;
                    return (
                      <tr key={key} className="hover:bg-white transition-colors">
                        <td className="px-4 py-3 text-sm font-bold text-slate-700 capitalize">
                          {key.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {typeof value === 'number'
                            ? value.toLocaleString('en-US', {
                                style: key.includes('income') || key.includes('balance')
                                  ? 'currency'
                                  : 'decimal',
                                currency: 'USD'
                              })
                            : String(value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Raw Text Preview */}
            {extractedData.raw_text_preview && (
              <div className="mt-4 p-4 bg-slate-100 border border-slate-200 rounded-xl">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Raw Text Preview
                </p>
                <p className="text-xs text-slate-600 font-mono leading-relaxed">
                  {extractedData.raw_text_preview}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-slate-50 border-t border-slate-200 p-6 flex items-center gap-4">
            <button
              type="button"
              onClick={handleApprove}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-200"
            >
              <CheckCircle className="w-5 h-5" />
              Approve & Process
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-200"
            >
              <XCircle className="w-5 h-5" />
              Reject Document
            </button>
            <button
              type="button"
              onClick={() => {
                setExtractedData(null);
                setUploadedFile(null);
                setError(null);
              }}
              className="px-6 py-4 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Process Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
