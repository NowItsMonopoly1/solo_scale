# Document Extraction - Quick Start Guide

## 🎯 What It Does

Automatically extracts data from mortgage documents using AI vision technology. Upload a paystub, W-2, or bank statement and get structured JSON data in seconds!

## ⚡ Quick Start (3 Steps)

### 1. Open Document Extraction
Click **"Document Extraction"** in the sidebar (file icon)

### 2. Select Document Type
Choose from:
- **Paystub** - Income verification
- **W-2** - Annual wages
- **Bank Statement** - Asset verification
- **1003** - Loan application
- **Tax Return** - Self-employed income
- **Other** - Generic extraction

### 3. Upload & Extract
- Drag and drop your file **OR** click to browse
- Click **"Extract Data"** button
- View results with confidence score

## 📊 What Gets Extracted

### Paystub
- Employee & employer names
- Pay period dates
- Gross pay & net pay
- Year-to-date income
- Deductions breakdown

### W-2 Form
- Employee name & SSN
- Employer info & EIN
- Total wages
- Tax withholding
- Tax year

### Bank Statement
- Account holder name
- Bank name
- Account number (last 4 digits)
- Statement period
- Beginning & ending balance
- Total deposits & withdrawals

## 💡 Pro Tips

✅ **Best Results:**
- Use clear, high-resolution scans (300+ DPI)
- Ensure document is right-side up
- Crop to document edges
- PDF or JPEG/PNG formats

⚠️ **Confidence Scores:**
- **90-100%** - Excellent, auto-approve
- **70-89%** - Good, quick review recommended
- **<70%** - Manual review required

📋 **After Extraction:**
- Copy data as JSON for integration
- Review warnings for missing/unclear fields
- Process another document or save results

## 🔒 Security Notes

- Documents are processed via Google Gemini API
- Data is **NOT stored** on servers by default
- Extracted data shows in your browser only
- Review sensitive info (SSNs) before sharing

## 🚀 Workflow Integration

### Example: Income Verification
1. Upload 2 recent paystubs
2. Extract gross pay from each
3. Calculate monthly income: `(YTD gross / months)`
4. Copy JSON to your LOS system
5. Done! ✅

### Example: Asset Check
1. Upload bank statement
2. Verify ending balance meets requirements
3. Note total deposits for cash flow analysis
4. Flag for manual review if confidence < 80%

## 📱 Keyboard Shortcuts

- `Ctrl/Cmd + V` - Paste image from clipboard (future)
- `Escape` - Clear current upload
- `Enter` - Start extraction (when file selected)

## ❓ Troubleshooting

**"Low confidence score"**
→ Try rescanning document with better lighting

**"Missing fields"**
→ Check warnings - field may not be visible in scan

**"Extraction failed"**
→ Verify file format (PDF, JPG, PNG only)

**"Processing stuck"**
→ Refresh page and try again (may be API timeout)

## 📞 Support

For help with document extraction:
1. Check this guide
2. View detailed docs: `DOCUMENT_EXTRACTION_GUIDE.md`
3. Contact your account admin

---

**Ready to save hours of manual data entry?**
Head to **Document Extraction** and start processing! 🚀
