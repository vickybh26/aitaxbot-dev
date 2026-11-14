# Private tax-document processing

User decision: source documents and identifying details must not be sent to AI;
scanned PDFs must use OCR on our own server.

## Implemented boundary

- Poppler reads PDF text locally. Tesseract reads pages without recognized text
  financial fields, including scanned pages. Passwords are used only locally.
- Source PDFs, page images and OCR text use a private OS temporary directory.
  Files are removed after successful processing and handled errors. Abrupt
  process termination cannot guarantee immediate removal.
- The provider receives constant tax-category labels, monetary numbers,
  validated tax years and bounded section codes. No document prose, identifiers,
  PDF bytes, filenames or arbitrary source headings are copied to requests.
- Reconciliation insights use a second numeric allowlist. Background RAG/shadow
  evaluation is disabled for this document flow.
- Extraction is explicitly partial. A mandatory report issue prevents a CLEAN
  verdict solely because the recognized subset reconciles.
- An unchecked collection notice is required before upload. The backend checks
  its version before multipart processing. A minimal receipt is merged into the
  existing user document and is removed by account deletion.

Financial facts can remain personal data. This is data minimisation, not an
anonymity claim, a guarantee of OCR accuracy or a DPDP compliance certificate.

## Runtime prerequisites and release gates

Dockerfile and nixpacks.toml declare poppler-utils, tesseract-ocr and English
language data. Verify the actual production build path includes these packages.
Windows development may set PDFINFO_BIN, PDFTOTEXT_BIN, PDFTOPPM_BIN and
TESSERACT_BIN to absolute executable paths. The standard Windows Tesseract
installation is also detected automatically. Never use a cloud OCR fallback.

Before deployment:

1. Run native scan and password-protected fixture smoke tests with synthetic data
   in the production container, including a mixed text/image document.
2. Verify encrypted, non-public scratch storage excluded from backups; configure
   host cleanup for private temporary directories left by terminated processes.
3. Verify OCR capacity/timeouts for up to 20 pages and five uploaded documents.
   Each worker allows at most two local extractions simultaneously. Pages are
   processed sequentially; subprocesses have time and output limits.
4. Validate representative AIS, 26AS and Form 16 layouts against human-verified
   totals before any stronger extraction-completeness claims.
5. Review applicable provider terms, grievance/withdrawal handling and retention
   separately. Broader deletion and retention audit items remain open.

## Commands

`node scripts/test-reconcile-private.mjs` exercises provider request capture,
identifier and document-instruction exclusion, mocked native OCR, scratch
cleanup, failure behavior and incomplete-report status. It makes no API calls.

`node node_modules/tsx/dist/cli.mjs scripts/test-reconcile-private-native.ts`
uses native Poppler and Tesseract on synthetic text, scanned and mixed PDFs,
including encrypted documents, incorrect passwords, page-limit rejection and
scratch-file cleanup. No provider calls or taxpayer files are involved.

On 16 October 2026, winget installed UB-Mannheim.TesseractOCR
5.4.0.20240606 with installer-hash verification, as approved by the user.
The native tests above passed locally. These results do not verify the
production container, encrypted scratch storage or representative tax layouts.

`node scripts/test-reconcile-log-privacy.mjs` checks fixed diagnostic logging.

The previous parser fixture runner uploaded real PDFs to Gemini. Its existing
command now delegates to the offline privacy regressions instead.
