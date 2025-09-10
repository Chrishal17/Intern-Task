'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PDFViewer from '@/components/ui/PDFViewer';
import InvoiceForm from '@/components/ui/InvoiceForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { api, InvoiceData } from '@/lib/api';

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const fileId = params.fileId as string;
  
  const [fileName, setFileName] = useState<string>('');
  const [invoiceData, setInvoiceData] = useState<InvoiceData | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('InvoicePage - fileId:', fileId);
    
    // Try to get existing invoice data for this fileId
    const loadExistingInvoice = async () => {
      try {
        const response = await api.getInvoices();
        const existingInvoice = response.data.find((inv: InvoiceData) => inv.fileId === fileId);
        
        if (existingInvoice) {
          console.log('Found existing invoice:', existingInvoice);
          setInvoiceData(existingInvoice);
          setFileName(existingInvoice.fileName);
        } else {
          console.log('No existing invoice found, will create new one');
          // Try to get file info to get the original filename
          try {
            const fileInfoResponse = await fetch(`${api.getPDFUrl(fileId)}/info`);
            if (fileInfoResponse.ok) {
              const fileInfo = await fileInfoResponse.json();
              console.log('File info:', fileInfo);
              setFileName(fileInfo.data?.filename || `document-${fileId}.pdf`);
            } else {
              console.log('Could not get file info, using default filename');
              setFileName(`document-${fileId}.pdf`);
            }
          } catch (fileInfoError) {
            console.log('Error getting file info, using default filename:', fileInfoError);
            setFileName(`document-${fileId}.pdf`);
          }
        }
      } catch (error) {
        console.error('Error loading existing invoice:', error);
        // Set a default filename even if there's an error
        setFileName(`document-${fileId}.pdf`);
      } finally {
        setLoading(false);
      }
    };

    if (fileId) {
      loadExistingInvoice();
    }
  }, [fileId]);

  const pdfUrl = api.getPDFUrl(fileId);

  const handleSave = (savedInvoice: InvoiceData) => {
    console.log('Invoice saved:', savedInvoice);
    setInvoiceData(savedInvoice);
    setFileName(savedInvoice.fileName);
  };

  const handleDelete = () => {
    router.push('/invoices');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="ml-4">
              <h1 className="text-lg font-semibold">
                {fileName || 'PDF Invoice'}
              </h1>
              <p className="text-xs text-gray-500">File ID: {fileId}</p>
            </div>
          </div>
          <Link href="/invoices">
            <Button variant="outline" size="sm">
              View All Invoices
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - PDF Viewer */}
        <div className="w-1/2 bg-white border-r">
          <PDFViewer fileUrl={pdfUrl} />
        </div>

        {/* Right Panel - Invoice Form */}
        <div className="w-1/2 bg-white">
          <InvoiceForm
            fileId={fileId}
            fileName={fileName}
            initialData={invoiceData}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}