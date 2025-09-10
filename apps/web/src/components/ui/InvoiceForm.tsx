'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Building2, FileText, Calculator, Zap, Save, X } from 'lucide-react';
import { InvoiceData, api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface InvoiceFormProps {
  fileId: string;
  fileName: string;
  initialData?: InvoiceData;
  onSave?: (invoice: InvoiceData) => void;
  onDelete?: () => void;
}

// Default form structure to prevent undefined values
const getDefaultFormData = (fileId: string, fileName: string): InvoiceData => ({
  fileId,
  fileName,
  vendor: {
    name: '',
    address: '',
    taxId: ''
  },
  invoice: {
    number: '',
    date: '',
    currency: 'USD',
    subtotal: 0,
    taxPercent: 0,
    total: 0,
    poNumber: '',
    poDate: '',
    lineItems: []
  }
});

export default function InvoiceForm({
  fileId,
  fileName,
  initialData,
  onSave,
  onDelete
}: InvoiceFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [formData, setFormData] = useState<InvoiceData>(() => 
    initialData || getDefaultFormData(fileId, fileName)
  );

  useEffect(() => {
    console.log('InvoiceForm useEffect - initialData:', initialData);
    console.log('Current formData:', formData);
    
    if (initialData) {
      try {
        const safeInitialData = {
          ...initialData,
          fileId: initialData.fileId || fileId,
          fileName: initialData.fileName || fileName,
          vendor: {
            name: initialData.vendor?.name || '',
            address: initialData.vendor?.address || '',
            taxId: initialData.vendor?.taxId || ''
          },
          invoice: {
            number: initialData.invoice?.number || '',
            date: initialData.invoice?.date || '',
            currency: initialData.invoice?.currency || 'USD',
            subtotal: Number(initialData.invoice?.subtotal) || 0,
            taxPercent: Number(initialData.invoice?.taxPercent) || 0,
            total: Number(initialData.invoice?.total) || 0,
            poNumber: initialData.invoice?.poNumber || '',
            poDate: initialData.invoice?.poDate || '',
            lineItems: Array.isArray(initialData.invoice?.lineItems) ? initialData.invoice.lineItems : []
          }
        };
        
        console.log('Setting safe initial data:', safeInitialData);
        setFormData(safeInitialData);
      } catch (error) {
        console.error('Error processing initial data:', error);
        setFormData(getDefaultFormData(fileId, fileName));
      }
    }
  }, [initialData, fileId, fileName]);

  const handleExtract = async (model: 'gemini' | 'groq') => {
    setExtracting(true);
    try {
      console.log(`Starting extraction with ${model} for fileId:`, fileId);
      
      const result = await api.extractData(fileId, model);
      console.log('Raw extraction result:', result);
      
      if (!result.success || !result.data) {
        throw new Error('Invalid extraction response');
      }
      
      // Ensure the extracted data has the proper structure
      const extractedData = {
        vendor: {
          name: result.data.vendor?.name || '',
          address: result.data.vendor?.address || '',
          taxId: result.data.vendor?.taxId || ''
        },
        invoice: {
          number: result.data.invoice?.number || '',
          date: result.data.invoice?.date || '',
          currency: result.data.invoice?.currency || 'USD',
          subtotal: Number(result.data.invoice?.subtotal) || 0,
          taxPercent: Number(result.data.invoice?.taxPercent) || 0,
          total: Number(result.data.invoice?.total) || 0,
          poNumber: result.data.invoice?.poNumber || '',
          poDate: result.data.invoice?.poDate || '',
          lineItems: Array.isArray(result.data.invoice?.lineItems) ? 
            result.data.invoice.lineItems.map((item: any) => ({
              description: String(item.description || ''),
              unitPrice: Number(item.unitPrice) || 0,
              quantity: Number(item.quantity) || 1,
              total: Number(item.total) || 0
            })) : []
        }
      };
      
      console.log('Processed extraction data:', extractedData);
      
      setFormData(prev => ({
        ...prev,
        vendor: extractedData.vendor,
        invoice: extractedData.invoice
      }));
      
      toast({
        title: 'Success',
        description: `Data extracted successfully using ${model}`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Extraction error:', error);
      
      if (errorMessage.includes('Service temporarily unavailable')) {
        toast({
          title: 'Service Unavailable',
          description: 'The AI service is currently overloaded. Please try again in a few minutes.',
          variant: 'destructive'
        });
      } else if (errorMessage.includes('quota exceeded')) {
        toast({
          title: 'Quota Exceeded',
          description: 'API usage limit reached. Please try again later.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Extraction Failed',
          description: errorMessage,
          variant: 'destructive'
        });
      }
    } finally {
      setExtracting(false);
    }
  };

  const validateFormData = (): { isValid: boolean; message?: string } => {
    console.log('Validating form data:', formData);
    
    if (!formData.fileId) {
      return { isValid: false, message: 'File ID is missing' };
    }
    if (!formData.fileName) {
      return { isValid: false, message: 'File name is missing' };
    }
    if (!formData.vendor?.name?.trim()) {
      return { isValid: false, message: 'Vendor name is required' };
    }
    if (!formData.invoice?.number?.trim()) {
      return { isValid: false, message: 'Invoice number is required' };
    }
    if (!formData.invoice?.date?.trim()) {
      return { isValid: false, message: 'Invoice date is required' };
    }
    
    // Ensure lineItems array exists
    if (!Array.isArray(formData.invoice?.lineItems)) {
      return { isValid: false, message: 'Line items array is missing' };
    }
    
    return { isValid: true };
  };

  const handleSave = async () => {
    const validation = validateFormData();
    if (!validation.isValid) {
      toast({
        title: 'Validation Error',
        description: validation.message,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Ensure all required fields are present and properly structured
      const invoicePayload = {
        fileId: formData?.fileId || fileId,
        fileName: formData?.fileName || fileName || `document-${fileId}.pdf`,
        vendor: {
          name: (formData?.vendor?.name || '').trim(),
          address: (formData?.vendor?.address || '').trim(),
          taxId: (formData?.vendor?.taxId || '').trim()
        },
        invoice: {
          number: (formData?.invoice?.number || '').trim(),
          date: formData?.invoice?.date || '',
          currency: formData?.invoice?.currency || 'USD',
          subtotal: Number(formData?.invoice?.subtotal) || 0,
          taxPercent: Number(formData?.invoice?.taxPercent) || 0,
          total: Number(formData?.invoice?.total) || 0,
          poNumber: (formData?.invoice?.poNumber || '').trim(),
          poDate: formData?.invoice?.poDate || '',
          lineItems: Array.isArray(formData?.invoice?.lineItems) ? 
            formData.invoice.lineItems.map(item => ({
              description: String(item?.description || '').trim(),
              unitPrice: Number(item?.unitPrice) || 0,
              quantity: Number(item?.quantity) || 1,
              total: Number(item?.total) || 0
            })) : []
        }
      };

      // Add _id for updates
      if (formData?._id) {
        (invoicePayload as any)._id = formData._id;
      }

      console.log('Saving invoice with payload:', invoicePayload);

      let result;
      if (formData?._id) {
        result = await api.updateInvoice(formData._id, invoicePayload);
      } else {
        result = await api.createInvoice(invoicePayload);
      }
      
      console.log('Save result:', result);
      
      if (result && result.success && result.data) {
        setFormData(result.data);
        onSave?.(result.data);
        toast({
          title: 'Success',
          description: 'Invoice saved successfully'
        });
      } else {
        console.error('Server response:', result);
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: `Failed to save invoice: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!formData._id) {
      toast({
        title: 'Error',
        description: 'Cannot delete unsaved invoice',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);
    try {
      await api.deleteInvoice(formData._id);
      onDelete?.();
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: `Failed to delete invoice: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = () => {
    setFormData(prev => {
      // Ensure invoice object exists
      if (!prev?.invoice) {
        console.error('Invoice object is missing');
        return prev;
      }
      
      // Ensure lineItems array exists
      const currentLineItems = Array.isArray(prev.invoice.lineItems) ? prev.invoice.lineItems : [];
      
      return {
        ...prev,
        invoice: {
          ...prev.invoice,
          lineItems: [
            ...currentLineItems,
            { description: '', unitPrice: 0, quantity: 1, total: 0 }
          ]
        }
      };
    });
  };

  const removeLineItem = (index: number) => {
    setFormData(prev => {
      // Ensure invoice and lineItems exist
      if (!prev?.invoice?.lineItems || !Array.isArray(prev.invoice.lineItems)) {
        console.error('LineItems array is missing');
        return prev;
      }
      
      return {
        ...prev,
        invoice: {
          ...prev.invoice,
          lineItems: prev.invoice.lineItems.filter((_, i) => i !== index)
        }
      };
    });
  };

  const updateLineItem = (index: number, field: 'description' | 'unitPrice' | 'quantity' | 'total', value: string | number) => {
    setFormData(prev => {
      // Ensure lineItems array exists and has the correct item
      if (!prev?.invoice?.lineItems || !Array.isArray(prev.invoice.lineItems)) {
        console.error('LineItems array is missing');
        return prev;
      }
      
      if (index < 0 || index >= prev.invoice.lineItems.length) {
        console.error('Invalid line item index:', index);
        return prev;
      }

      const newLineItems = [...prev.invoice.lineItems];
      const currentItem = newLineItems[index];
      
      if (!currentItem) {
        console.error('Line item not found at index:', index);
        return prev;
      }
      
      newLineItems[index] = { ...currentItem, [field]: value };
      
      if (field === 'unitPrice' || field === 'quantity') {
        const unitPrice = field === 'unitPrice' ? Number(value) || 0 : Number(currentItem.unitPrice) || 0;
        const quantity = field === 'quantity' ? Number(value) || 0 : Number(currentItem.quantity) || 0;
        newLineItems[index].total = unitPrice * quantity;
      }
      
      return {
        ...prev,
        invoice: {
          ...prev.invoice,
          lineItems: newLineItems
        }
      };
    });
  };

  const getStringValue = (value: string | undefined | null): string => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const getNumberValue = (value: number | undefined | null): string => {
    if (value === null || value === undefined || isNaN(Number(value))) return '';
    return String(value);
  };

  // Safe access to form data
  const safeFormData = {
    vendor: formData?.vendor || { name: '', address: '', taxId: '' },
    invoice: formData?.invoice || { 
      number: '', 
      date: '', 
      currency: 'USD', 
      subtotal: 0, 
      taxPercent: 0, 
      total: 0, 
      poNumber: '', 
      poDate: '', 
      lineItems: [] 
    }
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6 bg-gradient-to-b from-white to-gray-50">
      {/* Extract Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => handleExtract('gemini')}
          disabled={extracting || loading}
          variant="outline"
          type="button"
          className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 text-blue-700 font-medium"
        >
          <Zap className="h-4 w-4 mr-2" />
          {extracting ? 'Extracting...' : 'Extract with Gemini'}
        </Button>
        <Button
          onClick={() => handleExtract('groq')}
          disabled={extracting || loading}
          variant="outline"
          type="button"
          className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 hover:from-purple-100 hover:to-purple-200 text-purple-700 font-medium"
        >
          <Zap className="h-4 w-4 mr-2" />
          {extracting ? 'Extracting...' : 'Extract with Groq'}
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-6">
        {/* Vendor Information */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center text-lg font-bold">
              <Building2 className="h-5 w-5 mr-3" />
              Vendor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="vendor-name" className="text-sm font-semibold text-gray-700">Name *</Label>
              <Input
                id="vendor-name"
                value={getStringValue(safeFormData.vendor.name)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vendor: { ...prev?.vendor, name: e.target.value }
                }))}
                placeholder="Enter vendor name"
                required
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-address" className="text-sm font-semibold text-gray-700">Address</Label>
              <Input
                id="vendor-address"
                value={getStringValue(safeFormData.vendor.address)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vendor: { ...prev?.vendor, address: e.target.value }
                }))}
                placeholder="Enter vendor address"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-tax-id" className="text-sm font-semibold text-gray-700">Tax ID</Label>
              <Input
                id="vendor-tax-id"
                value={getStringValue(safeFormData.vendor.taxId)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vendor: { ...prev?.vendor, taxId: e.target.value }
                }))}
                placeholder="Enter tax ID"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Information */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-green-50/30">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center text-lg font-bold">
              <FileText className="h-5 w-5 mr-3" />
              Invoice Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="invoice-number" className="text-sm font-semibold text-gray-700">Invoice Number *</Label>
                <Input
                  id="invoice-number"
                  value={getStringValue(safeFormData.invoice.number)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, number: e.target.value }
                  }))}
                  placeholder="Enter invoice number"
                  required
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-date" className="text-sm font-semibold text-gray-700">Invoice Date *</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={getStringValue(safeFormData.invoice.date)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, date: e.target.value }
                  }))}
                  required
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-semibold text-gray-700">Currency</Label>
                <Input
                  id="currency"
                  value={getStringValue(safeFormData.invoice.currency)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, currency: e.target.value }
                  }))}
                  placeholder="USD"
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtotal" className="text-sm font-semibold text-gray-700">Subtotal</Label>
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
                  value={getNumberValue(safeFormData.invoice.subtotal)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, subtotal: parseFloat(e.target.value) || 0 }
                  }))}
                  placeholder="0.00"
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-percent" className="text-sm font-semibold text-gray-700">Tax %</Label>
                <Input
                  id="tax-percent"
                  type="number"
                  step="0.01"
                  value={getNumberValue(safeFormData.invoice.taxPercent)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, taxPercent: parseFloat(e.target.value) || 0 }
                  }))}
                  placeholder="0.00"
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="total" className="text-sm font-semibold text-gray-700">Total</Label>
              <Input
                id="total"
                type="number"
                step="0.01"
                value={getNumberValue(safeFormData.invoice.total)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  invoice: { ...prev?.invoice, total: parseFloat(e.target.value) || 0 }
                }))}
                placeholder="0.00"
                className="border-gray-300 focus:border-green-500 focus:ring-green-500 font-semibold text-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="po-number" className="text-sm font-semibold text-gray-700">PO Number</Label>
                <Input
                  id="po-number"
                  value={getStringValue(safeFormData.invoice.poNumber)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, poNumber: e.target.value }
                  }))}
                  placeholder="Enter PO number"
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="po-date" className="text-sm font-semibold text-gray-700">PO Date</Label>
                <Input
                  id="po-date"
                  type="date"
                  value={getStringValue(safeFormData.invoice.poDate)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, poDate: e.target.value }
                  }))}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-purple-50/30">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between text-lg font-bold">
              <div className="flex items-center">
                <Calculator className="h-5 w-5 mr-3" />
                Line Items
              </div>
              <Button
                onClick={addLineItem}
                size="sm"
                type="button"
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.isArray(safeFormData.invoice.lineItems) && safeFormData.invoice.lineItems.length > 0 ? (
                safeFormData.invoice.lineItems.map((item, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <div className="grid grid-cols-5 gap-4 items-end">
                      <div className="col-span-2 space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">Description</Label>
                        <Input
                          value={getStringValue(item?.description)}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={getNumberValue(item?.unitPrice)}
                          onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">Quantity</Label>
                        <Input
                          type="number"
                          step="1"
                          value={getNumberValue(item?.quantity)}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="1"
                          className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex items-end space-x-2">
                        <div className="flex-1 space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Total</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={getNumberValue(item?.total)}
                            onChange={(e) => updateLineItem(index, 'total', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="border-gray-300 focus:border-purple-500 focus:ring-purple-500 font-semibold"
                          />
                        </div>
                        <Button
                          onClick={() => removeLineItem(index)}
                          variant="outline"
                          size="icon"
                          type="button"
                          disabled={loading}
                          className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No line items added yet.</p>
                  <p className="text-sm mt-1">Click "Add Item" to get started.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200 bg-white/50 rounded-lg p-4">
        <div>
          {formData?._id && (
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={loading}
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              <X className="h-4 w-4 mr-2" />
              {loading ? 'Deleting...' : 'Delete Invoice'}
            </Button>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={loading || extracting}
          type="button"
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium px-6"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : 'Save Invoice'}
        </Button>
      </div>
    </div>
  );
}