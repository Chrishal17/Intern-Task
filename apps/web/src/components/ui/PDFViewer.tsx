// Completely redesigned UI for PDFViewer.tsx

'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

// Use cdnjs instead of unpkg for better reliability
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  fileUrl: string;
}

export default function PDFViewer({ fileUrl }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setIsLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
    setError('Failed to load PDF document');
    setIsLoading(false);
  }

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.25));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.25, prev - 0.25));
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setPageNumber(1);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg border border-red-200">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 mb-6 inline-block">
            <RefreshCw className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">PDF Load Error</h3>
          <p className="text-red-700 mb-6 max-w-md">{error}</p>
          <Button
            onClick={handleRetry}
            variant="outline"
            size="default"
            className="bg-white border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 font-medium px-6"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-xl overflow-hidden border border-gray-200">
      {/* Controls */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <Button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1 || isLoading}
            size="sm"
            variant="outline"
            aria-label="Previous Page"
            className="bg-white border-gray-300 hover:bg-gray-50 hover:border-blue-400 text-gray-700 font-medium shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="bg-white rounded-lg px-4 py-2 border border-gray-300 shadow-sm">
            <span className="text-sm font-semibold text-gray-800">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span>Loading...</span>
                </div>
              ) : (
                `${pageNumber} / ${numPages}`
              )}
            </span>
          </div>
          <Button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages || isLoading}
            size="sm"
            variant="outline"
            aria-label="Next Page"
            className="bg-white border-gray-300 hover:bg-gray-50 hover:border-blue-400 text-gray-700 font-medium shadow-sm"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={zoomOut}
            size="sm"
            variant="outline"
            disabled={isLoading}
            aria-label="Zoom Out"
            className="bg-white border-gray-300 hover:bg-gray-50 hover:border-purple-400 text-gray-700 font-medium shadow-sm"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <div className="bg-white rounded-lg px-4 py-2 border border-gray-300 shadow-sm min-w-[70px] text-center">
            <span className="text-sm font-semibold text-gray-800">
              {Math.round(scale * 100)}%
            </span>
          </div>
          <Button
            onClick={zoomIn}
            size="sm"
            variant="outline"
            disabled={isLoading}
            aria-label="Zoom In"
            className="bg-white border-gray-300 hover:bg-gray-50 hover:border-purple-400 text-gray-700 font-medium shadow-sm"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-white">
        <div className="flex justify-center">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex flex-col items-center justify-center p-16">
                  <div className="bg-blue-100 rounded-full p-6 mb-6">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading PDF Document</h3>
                  <p className="text-gray-600">Please wait while we prepare your document...</p>
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center p-12">
                  <div className="bg-red-100 rounded-full p-4 mb-4">
                    <RefreshCw className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-red-600 font-medium">Error loading PDF</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                loading={
                  <div className="flex flex-col items-center justify-center p-12">
                    <div className="bg-blue-50 rounded-full p-4 mb-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                    <p className="text-gray-700 font-medium">Loading page...</p>
                  </div>
                }
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}
