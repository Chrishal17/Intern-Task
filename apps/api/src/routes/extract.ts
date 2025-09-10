import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import mongoose from 'mongoose';
import pdfParse from 'pdf-parse';

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const extractionPrompt = `
Extract invoice data from this PDF content and return ONLY a valid JSON object with this exact structure:

{
  "vendor": {
    "name": "string",
    "address": "string (optional)",
    "taxId": "string (optional)"
  },
  "invoice": {
    "number": "string",
    "date": "string (YYYY-MM-DD format)",
    "currency": "string (optional)",
    "subtotal": "number (optional)",
    "taxPercent": "number (optional)",
    "total": "number (optional)",
    "poNumber": "string (optional)",
    "poDate": "string (optional, YYYY-MM-DD format)",
    "lineItems": [
      {
        "description": "string",
        "unitPrice": "number",
        "quantity": "number",
        "total": "number"
      }
    ]
  }
}

Rules:
- Return ONLY the JSON object, no other text
- If a field is not found, omit optional fields or use empty string for required fields
- Ensure all numbers are actual numbers, not strings
- Dates must be in YYYY-MM-DD format (convert from any format like "1. März 2024" to "2024-03-01" or "Nov 23 2012" to "2012-11-23")
- If no line items found, return empty array
- Extract ALL relevant line items from the invoice
`;

// Create GridFS bucket using mongoose connection
const createBucket = () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not connected');
  }
  
  return new mongoose.mongo.GridFSBucket(db, { bucketName: 'pdfs' });
};

async function extractWithGemini(pdfBuffer: Buffer): Promise<any> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent([
      extractionPrompt,
      {
        inlineData: {
          data: pdfBuffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini raw response:', text);
    
    // Clean the response and parse JSON
    const cleanText = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanText);
    
    // Validate and normalize the response
    const normalizedData = {
      vendor: {
        name: parsedData.vendor?.name || '',
        address: parsedData.vendor?.address || '',
        taxId: parsedData.vendor?.taxId || ''
      },
      invoice: {
        number: parsedData.invoice?.number || '',
        date: parsedData.invoice?.date || '',
        currency: parsedData.invoice?.currency || 'USD',
        subtotal: Number(parsedData.invoice?.subtotal) || 0,
        taxPercent: Number(parsedData.invoice?.taxPercent) || 0,
        total: Number(parsedData.invoice?.total) || 0,
        poNumber: parsedData.invoice?.poNumber || '',
        poDate: parsedData.invoice?.poDate || '',
        lineItems: Array.isArray(parsedData.invoice?.lineItems) ? 
          parsedData.invoice.lineItems.map((item: any) => ({
            description: String(item.description || ''),
            unitPrice: Number(item.unitPrice) || 0,
            quantity: Number(item.quantity) || 1,
            total: Number(item.total) || 0
          })) : []
      }
    };
    
    console.log('Normalized Gemini data:', normalizedData);
    return normalizedData;
    
  } catch (error) {
    console.error('Gemini extraction error:', error);
    throw new Error(`Failed to extract with Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractWithGroq(pdfBuffer: Buffer): Promise<any> {
  try {
    // Extract text from PDF
    console.log('Extracting text from PDF buffer...');
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;
    
    console.log('PDF text extracted, length:', pdfText.length);
    console.log('First 1000 chars of PDF text:', pdfText.substring(0, 1000));
    
    if (!pdfText || pdfText.trim().length === 0) {
      throw new Error('No text could be extracted from the PDF. The PDF might be image-based or corrupted.');
    }

    // Try multiple models in case one fails
    const models = [
      'llama-3.1-8b-instant',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
      'gemma-7b-it'
    ];

    let lastError;
    for (const modelName of models) {
      try {
        console.log(`Trying Groq model: ${modelName}`);
        
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are an expert at extracting structured data from invoice text. ${extractionPrompt}`
            },
            {
              role: 'user',
              content: `Please extract invoice data from this PDF text content and return it as a JSON object:\n\n${pdfText}`
            }
          ],
          model: modelName,
          temperature: 0.1,
          max_tokens: 4096,
        });

        const responseText = completion.choices[0]?.message?.content;
        console.log(`Groq (${modelName}) raw response:`, responseText);

        if (!responseText) {
          throw new Error('No response from Groq API');
        }

        // Clean and parse the response
        let cleanText = responseText.trim();
        
        // Remove markdown code blocks if present
        cleanText = cleanText.replace(/```json\s*\n?/g, '').replace(/```\s*$/g, '').trim();
        
        // Try to find JSON object in the response
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanText = jsonMatch[0];
        }
        
        console.log(`Cleaned Groq (${modelName}) response:`, cleanText);
        
        let parsedData;
        try {
          parsedData = JSON.parse(cleanText);
        } catch (parseError) {
          console.error(`JSON parse error for ${modelName}:`, parseError);
          throw new Error('Invalid JSON response from Groq API');
        }
        
        // Validate and normalize the response
        const normalizedData = {
          vendor: {
            name: parsedData.vendor?.name || '',
            address: parsedData.vendor?.address || '',
            taxId: parsedData.vendor?.taxId || ''
          },
          invoice: {
            number: parsedData.invoice?.number || '',
            date: parsedData.invoice?.date || '',
            currency: parsedData.invoice?.currency || 'USD',
            subtotal: Number(parsedData.invoice?.subtotal) || 0,
            taxPercent: Number(parsedData.invoice?.taxPercent) || 0,
            total: Number(parsedData.invoice?.total) || 0,
            poNumber: parsedData.invoice?.poNumber || '',
            poDate: parsedData.invoice?.poDate || '',
            lineItems: Array.isArray(parsedData.invoice?.lineItems) ? 
              parsedData.invoice.lineItems.map((item: any) => ({
                description: String(item.description || ''),
                unitPrice: Number(item.unitPrice) || 0,
                quantity: Number(item.quantity) || 1,
                total: Number(item.total) || 0
              })) : []
          }
        };
        
        console.log(`Normalized Groq (${modelName}) data:`, normalizedData);
        return normalizedData;
        
      } catch (error) {
        console.error(`Error with Groq model ${modelName}:`, error);
        lastError = error;
        
        // If it's a model decommissioned error, try the next model
        if (error instanceof Error && error.message.includes('model_decommissioned')) {
          console.log(`Model ${modelName} decommissioned, trying next model...`);
          continue;
        }
        
        // If it's not a model issue, break and throw
        break;
      }
    }
    
    // If we get here, all models failed
    throw lastError;
    
  } catch (error) {
    console.error('Groq extraction error:', error);
    
    if (error instanceof Error && error.message.includes('rate limit')) {
      throw new Error('Groq API rate limit exceeded. Please try again later.');
    }
    
    if (error instanceof Error && error.message.includes('quota')) {
      throw new Error('Groq API quota exceeded. Please try again later.');
    }
    
    if (error instanceof Error && error.message.includes('model_decommissioned')) {
      throw new Error('All Groq models are currently unavailable. Please try Gemini instead.');
    }
    
    if (error instanceof Error && error.message.includes('No text could be extracted')) {
      throw new Error('Could not extract text from PDF. The file might be image-based or corrupted.');
    }
    
    throw new Error(`Failed to extract with Groq: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to get PDF buffer from GridFS
async function getPDFBuffer(fileId: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure database connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(fileId)) {
        throw new Error('Invalid file ID format');
      }

      const bucket = createBucket();
      const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
      
      const chunks: Buffer[] = [];

      downloadStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      downloadStream.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        if (pdfBuffer.length === 0) {
          reject(new Error('Empty file or file not found'));
        } else {
          console.log(`PDF buffer loaded: ${pdfBuffer.length} bytes`);
          resolve(pdfBuffer);
        }
      });

      downloadStream.on('error', (error: Error) => {
        console.error('GridFS download error:', error);
        if (error.message.includes('FileNotFound')) {
          reject(new Error('File not found'));
        } else {
          reject(new Error(`Failed to download file: ${error.message}`));
        }
      });

      // Set timeout to prevent hanging
      setTimeout(() => {
        downloadStream.destroy();
        reject(new Error('Download timeout'));
      }, 30000); // 30 second timeout

    } catch (error) {
      reject(error);
    }
  });
}

router.post('/', async (req: express.Request, res: express.Response) => {
  console.log('Extract request received:', req.body);
  
  try {
    const { fileId, model } = req.body;

    // Validate input
    if (!fileId || !model) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields',
        details: 'Both fileId and model are required' 
      });
    }

    if (!['gemini', 'groq'].includes(model)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid model',
        details: 'Model must be either "gemini" or "groq"' 
      });
    }

    // Check API keys
    if (model === 'gemini' && !process.env.GEMINI_API_KEY) {
      console.warn('Gemini API key not configured');
      return res.status(500).json({ 
        success: false,
        error: 'Configuration error',
        details: 'Gemini API key not configured' 
      });
    }

    if (model === 'groq' && !process.env.GROQ_API_KEY) {
      console.warn('Groq API key not configured');
      return res.status(500).json({ 
        success: false,
        error: 'Configuration error',
        details: 'Groq API key not configured' 
      });
    }

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ 
        success: false,
        error: 'Database error',
        details: 'Database not connected' 
      });
    }

    // Get PDF buffer
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await getPDFBuffer(fileId);
    } catch (error) {
      console.error('Failed to get PDF buffer:', error);
      return res.status(404).json({ 
        success: false,
        error: 'File error',
        details: error instanceof Error ? error.message : 'Failed to retrieve file'
      });
    }

    // Extract data based on model
    let extractedData;
    try {
      console.log(`Extracting data using ${model}...`);
      
      if (model === 'gemini') {
        extractedData = await extractWithGemini(pdfBuffer);
      } else {
        extractedData = await extractWithGroq(pdfBuffer);
      }
      
      console.log(`${model} extraction completed successfully`);
      
    } catch (error) {
      console.error('Extraction failed:', error);
      
      // Handle specific errors
      if (error instanceof Error && error.message.includes('503 Service Unavailable')) {
        return res.status(503).json({ 
          success: false,
          error: 'Service temporarily unavailable',
          details: 'The AI service is currently overloaded. Please try again in a few minutes.',
          retryable: true
        });
      }
      
      if (error instanceof Error && (error.message.includes('quota') || error.message.includes('Quota'))) {
        return res.status(429).json({ 
          success: false,
          error: 'Quota exceeded',
          details: 'API quota has been exceeded. Please try again later.',
          retryable: true
        });
      }
      
      if (error instanceof Error && error.message.includes('rate limit')) {
        return res.status(429).json({ 
          success: false,
          error: 'Rate limit exceeded',
          details: 'API rate limit exceeded. Please try again later.',
          retryable: true
        });
      }
      
      if (error instanceof Error && error.message.includes('model_decommissioned')) {
        return res.status(400).json({ 
          success: false,
          error: 'Model not supported',
          details: 'The requested model is no longer supported. Please try a different model.',
          retryable: false
        });
      }
      
      return res.status(500).json({ 
        success: false,
        error: 'Extraction failed',
        details: error instanceof Error ? error.message : 'Unknown extraction error',
        retryable: true
      });
    }

    // Validate extracted data structure
    if (!extractedData || typeof extractedData !== 'object') {
      return res.status(500).json({ 
        success: false,
        error: 'Invalid extraction result',
        details: 'Extracted data is not in expected format'
      });
    }

    if (!extractedData.vendor || !extractedData.invoice) {
      return res.status(500).json({ 
        success: false,
        error: 'Incomplete extraction',
        details: 'Missing required vendor or invoice data'
      });
    }

    console.log('Sending successful response with extracted data');
    
    res.json({
      success: true,
      data: extractedData,
      model: model,
      extractedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Extract route error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown server error'
    });
  }
});

export default router;