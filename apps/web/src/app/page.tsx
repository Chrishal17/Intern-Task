'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, List } from 'lucide-react';
import Link from 'next/link';
import { api, UploadResponse } from '@/lib/api';

export default function HomePage() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadResponse | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Error',
        description: 'Please select a PDF file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 25 * 1024 * 1024) { // 25MB
      toast({
        title: 'Error',
        description: 'File size must be less than 25MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const result = await api.uploadPDF(file);
      setUploadedFile(result);
      toast({
        title: 'Success',
        description: 'PDF uploaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload PDF',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              PDF Invoice Dashboard
            </h1>
            <p className="text-lg text-gray-600">
              Upload PDFs, extract data with AI, and manage your invoices
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-center">
                <Upload className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-4">Upload PDF</h2>
                
                <div className="mb-6">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="mb-4"
                  />
                  <p className="text-sm text-gray-500">
                    Select a PDF file (max 25MB)
                  </p>
                </div>

                {uploading && (
                  <div className="mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Uploading...</p>
                  </div>
                )}

                {uploadedFile && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm text-green-800">
                        {uploadedFile.fileName}
                      </span>
                    </div>
                    <Link
                      href={`/invoice/${uploadedFile.fileId}`}
                      className="inline-block mt-2"
                    >
                      <Button size="sm">
                        View & Extract Data
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-center">
                <List className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-4">Manage Invoices</h2>
                
                <div className="space-y-4">
                  <Link href="/invoices">
                    <Button className="w-full" variant="outline">
                      View All Invoices
                    </Button>
                  </Link>
                  
                  <div className="text-sm text-gray-500">
                    <p>Search, edit, and delete your saved invoices</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Upload</h3>
              <p className="text-gray-600">
                Drag and drop or click to upload PDF files up to 25MB
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Extraction</h3>
              <p className="text-gray-600">
                Use Gemini or Groq AI to automatically extract invoice data
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <List className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Full CRUD</h3>
              <p className="text-gray-600">
                Create, read, update, and delete invoice records with search
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}