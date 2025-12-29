import React, { useState, useCallback } from 'react';
import { useAgent, DocumentExtractionResult } from '../contexts/AgentContext';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2, FileType } from 'lucide-react';

type DocumentType = 'paystub' | 'w2' | 'bank_statement' | '1003' | 'tax_return' | 'other';

export function DocumentExtractor() {
  const { extractDocument, isProcessing } = useAgent();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('paystub');
  const [extractionResult, setExtractionResult] = useState<DocumentExtractionResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setExtractionResult(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setExtractionResult(null);
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) return;

    try {
      const result = await extractDocument(selectedFile, documentType);
      setExtractionResult(result);
    } catch (error) {
      console.error('Extraction failed:', error);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setExtractionResult(null);
  };

  const getDocumentIcon = (type: DocumentType) => {
    const iconMap: Record<DocumentType, React.ReactNode> = {
      paystub: <FileType className="w-5 h-5" />,
      w2: <FileText className="w-5 h-5" />,
      bank_statement: <FileText className="w-5 h-5" />,
      '1003': <FileText className="w-5 h-5" />,
      tax_return: <FileText className="w-5 h-5" />,
      other: <FileText className="w-5 h-5" />
    };
    return iconMap[type];
  };

  const formatFieldName = (key: string): string => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      // Format currency if it looks like a monetary value
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Document Extraction</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              AI-powered data extraction from mortgage documents
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Document Type Selector */}
        <div className="mb-6">
          <label className="block mb-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Document Type
            </span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['paystub', 'w2', 'bank_statement', '1003', 'tax_return', 'other'] as DocumentType[]).map((type) => (
              <button
                key={type}
                onClick={() => setDocumentType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  documentType === type
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                disabled={isProcessing}
              >
                {formatFieldName(type)}
              </button>
            ))}
          </div>
        </div>

        {/* File Upload Area */}
        {!selectedFile ? (
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept="application/pdf,image/*"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="w-12 h-12 text-slate-300 mb-3" />
              <span className="text-sm font-bold text-slate-700 mb-1">
                Drop file here or click to upload
              </span>
              <span className="text-xs text-slate-500">
                Supports PDF, JPG, PNG • Max 10MB
              </span>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected File */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="p-2 bg-blue-100 rounded-lg">
                {getDocumentIcon(documentType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type}
                </p>
              </div>
              {!isProcessing && (
                <button
                  onClick={clearSelection}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Extract Button */}
            {!extractionResult && (
              <button
                onClick={handleExtract}
                disabled={isProcessing}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing document...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Extract Data</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Extraction Results */}
        {extractionResult && (
          <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Confidence Score */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-emerald-900">Extraction Complete</p>
                  <p className="text-xs text-emerald-700">
                    Confidence: {extractionResult.confidence}%
                  </p>
                </div>
              </div>
              <span className="text-2xl font-black text-emerald-600">
                {extractionResult.confidence}%
              </span>
            </div>

            {/* Warnings */}
            {extractionResult.warnings && extractionResult.warnings.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900 mb-1">Warnings</p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      {extractionResult.warnings.map((warning, idx) => (
                        <li key={idx}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Extracted Data */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Extracted Data
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {Object.entries(extractionResult.extracted_data).map(([key, value]) => (
                  <div key={key} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm font-medium text-slate-600">
                        {formatFieldName(key)}
                      </span>
                      <span className="text-sm font-bold text-slate-900 text-right">
                        {formatValue(value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={clearSelection}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-bold text-sm transition-colors"
              >
                Process Another Document
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(extractionResult.extracted_data, null, 2));
                  alert('Data copied to clipboard!');
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors"
              >
                Copy as JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
