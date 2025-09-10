'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
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
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Extract Buttons */}
      <div className="flex space-x-2">
        <Button
          onClick={() => handleExtract('gemini')}
          disabled={extracting || loading}
          variant="outline"
          type="button"
        >
          {extracting ? 'Extracting...' : 'Extract with Gemini'}
        </Button>
        <Button
          onClick={() => handleExtract('groq')}
          disabled={extracting || loading}
          variant="outline"
          type="button"
        >
          {extracting ? 'Extracting...' : 'Extract with Groq'}
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {/* Vendor Information */}
        <Card>
          <CardHeader>
            <CardTitle>Vendor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="vendor-name">Name *</Label>
              <Input
                id="vendor-name"
                value={getStringValue(safeFormData.vendor.name)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vendor: { ...prev?.vendor, name: e.target.value }
                }))}
                placeholder="Enter vendor name"
                required
              />
            </div>
            <div>
              <Label htmlFor="vendor-address">Address</Label>
              <Input
                id="vendor-address"
                value={getStringValue(safeFormData.vendor.address)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vendor: { ...prev?.vendor, address: e.target.value }
                }))}
                placeholder="Enter vendor address"
              />
            </div>
            <div>
              <Label htmlFor="vendor-tax-id">Tax ID</Label>
              <Input
                id="vendor-tax-id"
                value={getStringValue(safeFormData.vendor.taxId)}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vendor: { ...prev?.vendor, taxId: e.target.value }
                }))}
                placeholder="Enter tax ID"
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice Information */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice-number">Invoice Number *</Label>
                <Input
                  id="invoice-number"
                  value={getStringValue(safeFormData.invoice.number)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, number: e.target.value }
                  }))}
                  placeholder="Enter invoice number"
                  required
                />
              </div>
              <div>
                <Label htmlFor="invoice-date">Invoice Date *</Label>
                <Input
                  id="invoice-date"
                  type="date"
                  value={getStringValue(safeFormData.invoice.date)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, date: e.target.value }
                  }))}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={getStringValue(safeFormData.invoice.currency)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, currency: e.target.value }
                  }))}
                  placeholder="USD"
                />
              </div>
              <div>
                <Label htmlFor="subtotal">Subtotal</Label>
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
                />
              </div>
              <div>
                <Label htmlFor="tax-percent">Tax %</Label>
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
                />
              </div>
            </div>
            <div>
              <Label htmlFor="total">Total</Label>
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
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="po-number">PO Number</Label>
                <Input
                  id="po-number"
                  value={getStringValue(safeFormData.invoice.poNumber)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, poNumber: e.target.value }
                  }))}
                  placeholder="Enter PO number"
                />
              </div>
              <div>
                <Label htmlFor="po-date">PO Date</Label>
                <Input
                  id="po-date"
                  type="date"
                  value={getStringValue(safeFormData.invoice.poDate)}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoice: { ...prev?.invoice, poDate: e.target.value }
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button onClick={addLineItem} size="sm" type="button" disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.isArray(safeFormData.invoice.lineItems) && safeFormData.invoice.lineItems.length > 0 ? (
                safeFormData.invoice.lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2 items-end">
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={getStringValue(item?.description)}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div>
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={getNumberValue(item?.unitPrice)}
                        onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        step="1"
                        value={getNumberValue(item?.quantity)}
                        onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={getNumberValue(item?.total)}
                        onChange={(e) => updateLineItem(index, 'total', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <Button
                      onClick={() => removeLineItem(index)}
                      variant="outline"
                      size="icon"
                      type="button"
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No line items added yet.</p>
                  <p className="text-sm">Click "Add Item" to get started.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <div>
          {formData?._id && (
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={loading}
              type="button"
            >
              {loading ? 'Deleting...' : 'Delete Invoice'}
            </Button>
          )}
        </div>
        <Button 
          onClick={handleSave} 
          disabled={loading || extracting}
          type="button"
        >
          {loading ? 'Saving...' : 'Save Invoice'}
        </Button>
      </div>
    </div>
  );
}