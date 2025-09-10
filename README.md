# PDF Invoice Dashboard

A full-stack application for uploading PDFs, extracting invoice data using AI (Gemini/Groq), and managing invoice records with full CRUD operations.

## 🌐 Live Demo

- **Web Application**: [https://your-web-app.vercel.app](https://your-web-app.vercel.app)
- **API Backend**: [https://your-api-app.vercel.app](https://your-api-app.vercel.app)

## 📋 Features

- 📄 **PDF Upload & Viewing**: Upload PDFs up to 25MB with zoom and navigation controls
- 🤖 **AI Data Extraction**: Extract invoice data using Gemini AI or Groq (with mock data)
- ✏️ **Editable Forms**: Edit extracted data with line items management
- 💾 **MongoDB Storage**: Full CRUD operations for invoice management
- 🔍 **Search Functionality**: Search invoices by vendor name and invoice number
- 📱 **Responsive Design**: Built with Next.js, TypeScript, and shadcn/ui

## 🛠️ Tech Stack

### Frontend (`apps/web`)
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components
- **react-pdf** for PDF viewing
- **Sonner** for notifications

### Backend (`apps/api`)
- **Node.js** with Express
- **TypeScript** for type safety
- **MongoDB** with Mongoose ODM
- **GridFS** for file storage
- **Google Gemini AI** for data extraction
- **Groq SDK** (with mock implementation)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- MongoDB Atlas account
- Gemini API key (optional, for AI extraction)
- Groq API key (optional, for AI extraction)

### Local Development

1. **Clone the repository**:
```bash
git clone <your-repo-url>
cd pdf-dashboard
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:

Create `apps/api/.env`:
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pdf-dashboard
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key
```

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

4. **Start development servers**:
```bash
# Start both API and Web concurrently
npm run dev

# Or start them separately:
npm run api:dev    # Start API on http://localhost:3001
npm run web:dev    # Start Web on http://localhost:3000
```

5. **Access the application**:
   - Web App: http://localhost:3000
   - API Health: http://localhost:3001/health

## 📡 API Documentation

### Base URL
- **Local**: `http://localhost:3001/api`
- **Production**: `https://pdf-dashboard-api.vercel.app/api`

### Endpoints

#### File Upload
```http
POST /upload
Content-Type: multipart/form-data

Body: pdf file (max 25MB)

Response:
{
  "success": true,
  "fileId": "648f...",
  "fileName": "invoice.pdf",
  "message": "File uploaded successfully"
}
```

#### Data Extraction
```http
POST /extract
Content-Type: application/json

Body:
{
  "fileId": "648f...",
  "model": "gemini" | "groq"
}

Response:
{
  "success": true,
  "data": {
    "vendor": { "name": "...", "address": "...", "taxId": "..." },
    "invoice": { "number": "...", "date": "...", "lineItems": [...] }
  },
  "model": "gemini"
}
```

#### Invoice CRUD
```http
# List invoices
GET /invoices?q=search_term

# Get single invoice
GET /invoices/:id

# Create invoice
POST /invoices
{
  "fileId": "...",
  "fileName": "...",
  "vendor": {...},
  "invoice": {...}
}

# Update invoice
PUT /invoices/:id
{
  "vendor": {...},
  "invoice": {...}
}

# Delete invoice
DELETE /invoices/:id
```

## 📊 Data Structure

The application stores invoice data in MongoDB with this structure:

```typescript
interface InvoiceData {
  _id?: string;
  fileId: string;
  fileName: string;
  vendor: {
    name: string;
    address?: string;
    taxId?: string;
  };
  invoice: {
    number: string;
    date: string; // YYYY-MM-DD format
    currency?: string;
    subtotal?: number;
    taxPercent?: number;
    total?: number;
    poNumber?: string;
    poDate?: string;
    lineItems: Array<{
      description: string;
      unitPrice: number;
      quantity: number;
      total: number;
    }>;
  };
  createdAt?: string;
  updatedAt?: string;
}
```

## 🔧 Configuration

### Environment Variables

#### API (`apps/api/.env`)
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3001)
- `MONGODB_URI`: MongoDB connection string
- `GEMINI_API_KEY`: Google Gemini API key (optional)
- `GROQ_API_KEY`: Groq API key (optional)

#### Web (`apps/web/.env.local`)
- `NEXT_PUBLIC_API_URL`: API base URL

### Getting API Keys

1. **Gemini API Key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Groq API Key**: Visit [Groq Console](https://console.groq.com/keys)
3. **MongoDB**: Set up a free cluster at [MongoDB Atlas](https://cloud.mongodb.com/)

## 🚢 Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Deploy API**:
```bash
cd apps/api
vercel --prod
```

3. **Deploy Web App**:
```bash
cd apps/web
vercel --prod
```

4. **Configure Environment Variables**:
   - Add production environment variables in Vercel dashboard
   - Update `NEXT_PUBLIC_API_URL` to point to your deployed API

### Manual Deployment

1. **Build the applications**:
```bash
npm run build
```

2. **Deploy to your preferred hosting service**:
   - API: Any Node.js hosting (Heroku, Railway, etc.)
   - Web: Any static hosting (Netlify, Vercel, etc.)

## 🧪 Testing

### API Health Check
```bash
curl https://your-api-app.vercel.app/health
```

### Manual Testing Flow
1. Upload a PDF invoice
2. Click "Extract with Gemini" or "Extract with Groq"
3. Review and edit the extracted data
4. Save the invoice
5. Navigate to "View All Invoices"
6. Search, edit, or delete invoices

## 📁 Project Structure

```
pdf-dashboard/
├── apps/
│   ├── api/                 # Backend API
│   │   ├── src/
│   │   │   ├── config/      # Database configuration
│   │   │   ├── models/      # Mongoose models
│   │   │   ├── routes/      # API routes
│   │   │   └── index.ts     # Server entry point
│   │   ├── package.json
│   │   └── vercel.json      # API deployment config
│   └── web/                 # Frontend Next.js app
│       ├── src/
│       │   ├── app/         # App router pages
│       │   ├── components/  # Reusable components
│       │   ├── hooks/       # Custom React hooks
│       │   └── lib/         # Utilities and API client
│       ├── package.json
│       └── next.config.js   # Next.js configuration
├── package.json             # Root package.json (workspaces)
└── README.md               # This file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **"Database not connected"**: Check your MongoDB URI and network access
2. **"CORS error"**: Ensure your API URL is correctly configured in web app
3. **"PDF worker failed"**: PDF.js worker loading issue - refresh the page
4. **"Extraction failed"**: Check your AI API keys and quotas

### Support

For issues and questions:
- Check the GitHub Issues page
- Verify your environment variables
- Check the browser console and network tab for errors

## 📈 Performance Notes

- PDFs are stored in MongoDB GridFS (25MB limit)
- AI extraction timeout: 30 seconds
- Database connection pool: 5-10 connections
- File download timeout: 30 seconds

---

**Built with ❤️ using Next.js, Node.js, MongoDB, and AI**