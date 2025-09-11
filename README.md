# Full Stack Developer Internship - PDF Viewer + Data Extraction Dashboard

This repository contains the solution for the Full Stack Developer Internship assignment. The task involved building a PDF Viewer with AI data extraction and editing features.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Setup Instructions](#setup-instructions)
3. [Environment Variables](#environment-variables)
4. [API Documentation](#api-documentation)
5. [How to Run Locally](#how-to-run-locally)
6. [Deployed Application](#deployed-application)
7. [Demo Video](#demo-video)

## Tech Stack

- **Frontend:**
  - Next.js (App Router) + TypeScript
  - shadcn/ui for UI components
  - pdf.js for PDF rendering

- **Backend:**
  - Node.js with TypeScript
  - MongoDB (Atlas) for database storage

- **AI Integration:**
  - Gemini API or Groq for data extraction from PDFs

- **Deployment:**
  - Vercel for both web and API hosting

## Setup Instructions

Follow these steps to set up and run the project locally.

### 1. Clone the repository:
git clone https://github.com/yourusername/your-repository-name.git
cd your-repository-name

2. Install dependencies:

For both frontend and backend, you'll need to install dependencies.

Frontend (web):

cd apps/web
npm install


Backend (api):

cd apps/api
npm install

3. Environment Variables:

Create a .env.local file in the root directory of the project and include the following environment variables:

MONGODB_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_gemini_api_key_or_GROQ_API_KEY

4. Run the applications:

Frontend:

cd apps/web
npm run dev


Backend:

cd apps/api
npm run dev

5. Open the app:

Once both apps are running, visit the frontend at http://localhost:3000 in your browser to see the app in action.

API Documentation

The following RESTful API endpoints are available:

POST /upload

Description: Upload a PDF file.

Body:

{
  "file": <file>
}


Response:

{
  "fileId": "string",
  "fileName": "string"
}


POST /extract

Description: Extract data from the uploaded PDF using AI.

Body:

{
  "fileId": "string",
  "model": "gemini" | "groq"
}


Response:

{
  "vendor": { "name": "string", "taxId": "string", "address": "string" },
  "invoice": { "number": "string", "date": "string", "currency": "string", "total": "number" },
  "lineItems": [{ "description": "string", "unitPrice": "number", "quantity": "number", "total": "number" }]
}


GET /invoices

Description: List all invoices.

Query Parameters:
?q=<search_term> to search by vendor name or invoice number.

Response:

[
  {
    "fileId": "string",
    "fileName": "string",
    "vendor": { "name": "string", "taxId": "string" },
    "invoice": { "number": "string", "total": "number" },
    "lineItems": []
  }
]


GET /invoices/:id

Description: Get details of a specific invoice by ID.

Response:

{
  "fileId": "string",
  "fileName": "string",
  "vendor": { "name": "string", "taxId": "string" },
  "invoice": { "number": "string", "total": "number" },
  "lineItems": []
}


PUT /invoices/:id

Description: Update an invoice.

Body:

{
  "vendor": { "name": "string", "address": "string" },
  "invoice": { "number": "string", "total": "number" },
  "lineItems": [{ "description": "string", "unitPrice": "number", "quantity": "number", "total": "number" }]
}


DELETE /invoices/:id

Description: Delete an invoice by ID.

Response:

{
  "message": "Invoice deleted successfully"
}

How to Run Locally

Clone the repository.

Install dependencies for both the frontend and backend.

Set up your environment variables (MONGODB_URI and GEMINI_API_KEY).

Start both applications by running the respective commands in their directories.

Visit the frontend at http://localhost:3000 and interact with the PDF viewer and data extraction features.

Deployed Application

Web Application: [Your deployed web app URL]

API: [Your deployed API URL]

Demo Video

You can watch a demo video showcasing the following functionality:

PDF upload and rendering

AI data extraction (Gemini or Groq)

Data editing and CRUD operations

Search and update invoices

[Link to your demo video]


---

### How to Customize:

1. **GitHub Repo:** Replace `https://github.com/yourusername/your-repository-name.git` with the link to your GitHub repository.
2. **URLs:** Replace `[Your deployed web app URL]` and `[Your deployed API URL]` with your actual deployed URLs.
3. **Demo Video:** Add the actual URL of your demo video in the `[Link to your demo video]` placeholder.

This format should be ready for use and will guide the reviewers on how to set up and interact with your project. Let me know if you need any more tweaks!