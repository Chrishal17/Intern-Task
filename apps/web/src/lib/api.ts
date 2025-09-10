const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface InvoiceData {
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
    date: string;
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

export interface UploadResponse {
  fileId: string;
  fileName: string;
  message: string;
}

export interface ExtractResponse {
  success: boolean;
  data: Omit<InvoiceData, 'fileId' | 'fileName'>;
  model: string;
}

export const api = {
  uploadPDF: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('pdf', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.details || data.error || 'Upload failed');
    }

    return response.json();
  },

  extractData: async (fileId: string, model: 'gemini' | 'groq'): Promise<ExtractResponse> => {
    const response = await fetch(`${API_BASE_URL}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId, model }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle different error types
      if (response.status === 503) {
        throw new Error(data.details || 'Service temporarily unavailable. Please try again in a few minutes.');
      }
      if (response.status === 429) {
        throw new Error(data.details || 'API quota exceeded. Please try again later.');
      }
      if (response.status === 404) {
        throw new Error(data.details || 'File not found.');
      }
      
      throw new Error(data.details || data.error || 'Extraction failed');
    }

    return data;
  },

  getInvoices: async (search?: string) => {
    const url = new URL(`${API_BASE_URL}/invoices`);
    if (search) {
      url.searchParams.append('q', search);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.details || data.error || 'Failed to fetch invoices');
    }

    return response.json();
  },

  getInvoice: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}`);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.details || data.error || 'Failed to fetch invoice');
    }

    return response.json();
  },

  createInvoice: async (data: InvoiceData) => {
    const response = await fetch(`${API_BASE_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to create invoice');
    }

    return response.json();
  },

  updateInvoice: async (id: string, data: Partial<InvoiceData>) => {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to update invoice');
    }

    return response.json();
  },

  deleteInvoice: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to delete invoice');
    }

    return response.json();
  },

  getPDFUrl: (fileId: string): string => {
    return `${API_BASE_URL}/upload/${fileId}`;
  },
};