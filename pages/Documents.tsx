import React from 'react';
import { DocumentExtractor } from '../components/DocumentExtractor';
import { FileText, Zap, Shield, TrendingUp } from 'lucide-react';

export function Documents() {
  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      {/* Page Header */}
      <div className="px-8 py-6 bg-white border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 mb-2">Document Intelligence</h1>
        <p className="text-sm text-slate-600">
          AI-powered extraction from mortgage documents • Powered by Google Gemini Vision
        </p>
      </div>

      <div className="px-8 py-6 max-w-6xl mx-auto">
        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900">Instant Extraction</h3>
            </div>
            <p className="text-xs text-slate-600">
              Process paystubs, W2s, and bank statements in seconds with AI vision technology
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900">High Accuracy</h3>
            </div>
            <p className="text-xs text-slate-600">
              Confidence scores and warnings ensure data quality for underwriting decisions
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-900">Structured Data</h3>
            </div>
            <p className="text-xs text-slate-600">
              Export to JSON or integrate with your LOS for seamless workflow automation
            </p>
          </div>
        </div>

        {/* Main Extractor Component */}
        <DocumentExtractor />

        {/* Supported Documents */}
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Supported Document Types
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Income Verification
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  Paystubs (extracts gross pay, YTD, employer info)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  W-2 Forms (wages, tax withholding, SSN)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  Tax Returns (1040, Schedule C)
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Asset Verification
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                  Bank Statements (balances, deposits, withdrawals)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                  Investment Statements
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                  1003 Forms (Uniform Residential Loan Application)
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs text-blue-900">
              <span className="font-bold">Pro Tip:</span> For best results, use clear, high-resolution scans or photos of documents.
              The AI can handle slightly rotated or cropped images, but clearer documents yield higher confidence scores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
