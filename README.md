🛡️ GovAudit Pro: Forensic DPA Clause Auditor
AI-Agentic Legal Compliance & Vendor Risk Management
GovAudit Pro is an enterprise-grade forensic tool designed to automate the auditing of Data Processing Agreements (DPAs). Developed as a bridge between high-level legal theory and scalable software engineering, this application leverages Gemini 1.5 Pro to perform "deep-tissue" audits of legal contracts against global privacy standards.

⚖️ The Advantage
GovAudit Pro moves beyond simple keyword matching. It utilizes a weighted scoring matrix to evaluate the legal sufficiency of clauses, specifically targeting loopholes in GDPR, CCPA/CPRA, and US State Privacy Laws.

Core Capabilities
Agentic Forensic Review: Orchestrates a "Senior Privacy Counsel" persona to extract and analyze 10 critical operative categories (Breach Notification, DSAR Assistance, Retention, etc.).

Weighted Anonymization Scoring: Evaluates de-identification clauses using a 40/30/20/10 risk-weighting model based on GDPR Recital 26 and CCPA § 1798.140.

Multi-Jurisdictional Logic: Dynamically merges requirements for EU, UK, and individual US State laws into a single audit report.

Gold-Standard Drafting: Automatically generates compliant replacement clauses to resolve identified risks.

🛠️ Technical Stack
Frontend: React 18, TypeScript, Tailwind CSS.

AI Engine: Google Generative AI (Gemini 1.5 Pro) with Structured JSON Output.

Icons: Lucide-React.

Persistence: Privacy-by-Design LocalStorage vault (No contract data leaves the client environment).

Security: Semgrep-scanned code and "Pre-flight" environment variable validation.

🚀 Getting Started
1. Environment Setup
Create a .env file in the root directory:

Plaintext
GEMINI_API_KEY=your_google_ai_key_here
2. Installation
Bash
npm install
npm start
3. Usage
Enter the Vendor Name and select Target Jurisdictions.

Upload the DPA PDF.

Review the AI Forensic Analysis side-by-side with the original text.

Verify or Reject clauses in the Counsel's Verification Station.

Lock the audit to the Historical Vault for permanent local record-keeping.

📁 Repository Structure
App.tsx: The core React logic and Agentic prompt orchestration.

Logic.md: Detailed legal reasoning behind the weighted risk scoring.

.gitignore: Strictly configured to ignore .env and local data folders to prevent PII leakage.

⚠️ Legal Disclaimer
IMPORTANT: This tool provides Legal Information, not Legal Advice.

GovAudit Pro was developed for educational and auditing purposes as part of a self project 
No Attorney-Client Relationship: Use of this software does not create an attorney-client relationship.

Verification Required: AI-generated analyses and drafted clauses must be reviewed and verified by qualified legal counsel.

No Liability: The author is not responsible for any business decisions or legal filings made based on the output of this software.

Local Data Only: This tool is designed with a "Privacy-by-Design" architecture. Users are responsible for ensuring they have the right to process any documents uploaded to the system.
