# extractMortgageData() Method - Usage Guide

## Overview

The `extractMortgageData()` method is a specialized document extraction function designed for mortgage underwriting. It automatically detects document types, extracts key financial entities, and flags discrepancies.

## Method Signature

```typescript
public async extractMortgageData(
  base64Pdf: string,              // Base64-encoded PDF or image
  mimeType: string = 'application/pdf',
  expectedBorrowerName?: string    // Optional: Name to validate against
): Promise<{
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
}>
```

## Key Features

✅ **Auto Document Detection** - Identifies Bank Statement, Paystub, W-2, etc.
✅ **Key Entity Extraction** - Name, employer, income, balance, SSN (last 4), etc.
✅ **Discrepancy Detection** - Validates against expected borrower name
✅ **Severity Levels** - Flags issues as low/medium/high priority
✅ **Confidence Scoring** - 0-100 score based on document quality

## Example Usage

### Basic Extraction

```typescript
import { GeminiService } from './services/geminiService';

const service = GeminiService.getInstance(config);

// Convert file to base64
const file = document.getElementById('fileInput').files[0];
const base64 = await fileToBase64(file);

// Extract mortgage data
const result = await service.extractMortgageData(
  base64,
  'application/pdf'
);

console.log('Document Type:', result.document_type);
console.log('Applicant Name:', result.key_entities.name);
console.log('Total Income/Balance:', result.key_entities.total_income || result.key_entities.total_balance);
console.log('Confidence:', result.extraction_confidence);

// Check for discrepancies
if (result.discrepancy_alerts.length > 0) {
  console.warn('⚠️ Discrepancies found:');
  result.discrepancy_alerts.forEach(alert => {
    console.log(`  - [${alert.severity.toUpperCase()}] ${alert.field}: ${alert.issue}`);
  });
}
```

### With Borrower Validation

```typescript
// When you know the expected borrower name
const result = await service.extractMortgageData(
  base64,
  'application/pdf',
  'John Doe'  // Expected borrower name
);

// Check if name matches
const nameAlert = result.discrepancy_alerts.find(a => a.field === 'name');
if (nameAlert && nameAlert.severity === 'high') {
  alert('⚠️ Name mismatch detected! Document may belong to a different person.');
  flagForManualReview(result);
}
```

### Complete Workflow Example

```typescript
async function processLoanDocument(file: File, borrowerName: string) {
  // 1. Convert to base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // 2. Extract mortgage data
  const result = await service.extractMortgageData(
    base64,
    file.type,
    borrowerName
  );

  // 3. Evaluate results
  console.log('📄 Document Analysis');
  console.log('====================');
  console.log(`Type: ${result.document_type}`);
  console.log(`Confidence: ${result.extraction_confidence}%`);
  console.log('');

  console.log('👤 Key Entities');
  console.log('====================');
  Object.entries(result.key_entities).forEach(([key, value]) => {
    if (value) {
      console.log(`${key}: ${value}`);
    }
  });
  console.log('');

  // 4. Handle discrepancies
  if (result.discrepancy_alerts.length > 0) {
    console.log('⚠️ Discrepancy Alerts');
    console.log('====================');

    const highSeverity = result.discrepancy_alerts.filter(a => a.severity === 'high');
    const mediumSeverity = result.discrepancy_alerts.filter(a => a.severity === 'medium');
    const lowSeverity = result.discrepancy_alerts.filter(a => a.severity === 'low');

    if (highSeverity.length > 0) {
      console.error('🚨 HIGH PRIORITY:');
      highSeverity.forEach(a => console.error(`  - ${a.field}: ${a.issue}`));
    }

    if (mediumSeverity.length > 0) {
      console.warn('⚠️ MEDIUM PRIORITY:');
      mediumSeverity.forEach(a => console.warn(`  - ${a.field}: ${a.issue}`));
    }

    if (lowSeverity.length > 0) {
      console.info('ℹ️ LOW PRIORITY:');
      lowSeverity.forEach(a => console.info(`  - ${a.field}: ${a.issue}`));
    }
  }

  // 5. Make decision
  if (result.extraction_confidence >= 90 && result.discrepancy_alerts.length === 0) {
    return { status: 'AUTO_APPROVED', data: result };
  } else if (result.discrepancy_alerts.some(a => a.severity === 'high')) {
    return { status: 'REJECTED', data: result, reason: 'High severity discrepancies found' };
  } else {
    return { status: 'MANUAL_REVIEW', data: result };
  }
}

// Usage
const decision = await processLoanDocument(uploadedFile, 'Jane Smith');

if (decision.status === 'AUTO_APPROVED') {
  autoPopulateForm(decision.data.key_entities);
} else if (decision.status === 'REJECTED') {
  notifyUnderwriter(decision.reason);
} else {
  flagForReview(decision.data);
}
```

## Response Examples

### Bank Statement (No Discrepancies)

```json
{
  "document_type": "Bank Statement",
  "key_entities": {
    "name": "John Doe",
    "account_number": "1234",
    "total_balance": 45000.00,
    "address": "123 Main St, City, State 12345"
  },
  "discrepancy_alerts": [],
  "extraction_confidence": 95,
  "raw_text_preview": "CHASE BANK Statement for Account ending in 1234 Account Holder: John Doe Statement Period: 01/01/2024 - 01/31/2024 Beginning Balance: $42,000.00 Ending Balance: $45,000.00..."
}
```

### Paystub (With Name Mismatch)

```json
{
  "document_type": "Paystub",
  "key_entities": {
    "name": "Jane Smith",
    "employer": "ABC Corporation",
    "total_income": 5000.00
  },
  "discrepancy_alerts": [
    {
      "field": "name",
      "issue": "Name 'Jane Smith' does not match expected borrower 'John Doe'",
      "severity": "high"
    }
  ],
  "extraction_confidence": 88,
  "raw_text_preview": "ABC CORPORATION Employee: Jane Smith Employee ID: 12345 Pay Period: 01/01/2024 - 01/15/2024 Gross Pay: $5,000.00..."
}
```

### W-2 (Missing Fields)

```json
{
  "document_type": "W-2",
  "key_entities": {
    "name": "John Doe",
    "employer": "XYZ Inc",
    "total_income": 75000.00,
    "ssn": "5678"
  },
  "discrepancy_alerts": [
    {
      "field": "address",
      "issue": "Employee address not found on W-2 form",
      "severity": "medium"
    },
    {
      "field": "document_quality",
      "issue": "Document appears to be a low-resolution scan",
      "severity": "low"
    }
  ],
  "extraction_confidence": 72,
  "raw_text_preview": "Form W-2 Wage and Tax Statement 2023 Employee: John Doe SSN: ***-**-5678 Employer: XYZ Inc Wages: $75,000.00..."
}
```

## Discrepancy Types

### High Severity (Auto-Reject)
- ❌ Name mismatch with expected borrower
- ❌ Document appears altered or forged
- ❌ Critical extraction failure

### Medium Severity (Manual Review)
- ⚠️ Missing required fields (address, SSN, etc.)
- ⚠️ Income/balance outside normal range
- ⚠️ Date inconsistencies

### Low Severity (Informational)
- ℹ️ Low document quality/resolution
- ℹ️ Minor formatting issues
- ℹ️ Partial data extraction

## Integration with Underwriting Workflow

```typescript
// Step 1: Collect all documents for a loan application
const documents = [
  { file: paystub1, type: 'income' },
  { file: paystub2, type: 'income' },
  { file: bankStatement, type: 'asset' },
  { file: w2Form, type: 'income' }
];

// Step 2: Extract data from each document
const results = [];
for (const doc of documents) {
  const base64 = await fileToBase64(doc.file);
  const result = await service.extractMortgageData(base64, doc.file.type, borrowerName);
  results.push({ ...result, category: doc.type });
}

// Step 3: Aggregate income
const incomeDocuments = results.filter(r => r.category === 'income');
const totalMonthlyIncome = incomeDocuments.reduce((sum, doc) => {
  return sum + (doc.key_entities.total_income || 0);
}, 0);

// Step 4: Verify assets
const assetDocuments = results.filter(r => r.category === 'asset');
const totalLiquidAssets = assetDocuments.reduce((sum, doc) => {
  return sum + (doc.key_entities.total_balance || 0);
}, 0);

// Step 5: Check for any high-severity issues
const highSeverityIssues = results.flatMap(r =>
  r.discrepancy_alerts.filter(a => a.severity === 'high')
);

if (highSeverityIssues.length > 0) {
  console.error('❌ Application flagged for review due to high-severity discrepancies');
  notifyUnderwriter(highSeverityIssues);
} else if (totalMonthlyIncome >= requiredIncome && totalLiquidAssets >= requiredAssets) {
  console.log('✅ Financial requirements met, proceeding to next stage');
  advanceLoanApplication();
} else {
  console.warn('⚠️ Insufficient income or assets');
  requestAdditionalDocumentation();
}
```

## Comparison with extractDocumentData()

| Feature | `extractMortgageData()` | `extractDocumentData()` |
|---------|------------------------|------------------------|
| **Auto Document Detection** | ✅ Yes | ❌ No (requires type input) |
| **Discrepancy Checking** | ✅ Yes (with name validation) | ❌ No |
| **Severity Levels** | ✅ High/Medium/Low | ❌ Only warnings |
| **Raw Text Preview** | ✅ Yes | ❌ No |
| **Schema Flexibility** | Fixed mortgage schema | Custom per document type |
| **Use Case** | Mortgage underwriting | General document extraction |

## Best Practices

1. **Always Validate Names** - Pass `expectedBorrowerName` to catch identity mismatches
2. **Check Confidence Scores** - Only auto-approve if confidence >= 85%
3. **Handle High Severity** - Never auto-approve documents with high-severity alerts
4. **Review Raw Text** - Use `raw_text_preview` to verify extraction accuracy
5. **Log Everything** - Save extraction results for audit trails

## Error Handling

```typescript
try {
  const result = await service.extractMortgageData(base64, mimeType, borrowerName);

  // Check for extraction failure
  if (result.document_type === "Error") {
    console.error('Extraction failed:', result.discrepancy_alerts[0].issue);
    // Fallback to manual review
    return { status: 'MANUAL_ENTRY_REQUIRED' };
  }

  // Process successful extraction
  return processResult(result);

} catch (error) {
  console.error('Unexpected error:', error);
  // Notify support team
  reportError(error);
  return { status: 'SYSTEM_ERROR' };
}
```

## Testing

```typescript
// Mock test data
const mockResult = {
  document_type: "Paystub",
  key_entities: {
    name: "Test User",
    employer: "Test Corp",
    total_income: 5000
  },
  discrepancy_alerts: [],
  extraction_confidence: 95,
  raw_text_preview: "Mock paystub data..."
};

// Test with actual document
const testFile = await fetch('/test-paystub.pdf').then(r => r.blob());
const base64 = await fileToBase64(testFile);
const result = await service.extractMortgageData(base64, 'application/pdf', 'Test User');

expect(result.document_type).toBe('Paystub');
expect(result.key_entities.name).toBe('Test User');
expect(result.extraction_confidence).toBeGreaterThan(70);
```

---

**Ready to streamline your mortgage underwriting with AI-powered document validation!** 🚀
