'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Search, Edit, Trash2, FileText, Calendar, DollarSign, Plus } from 'lucide-react';
import Link from 'next/link';
import { api, InvoiceData } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function InvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadInvoices = async (search?: string) => {
    setLoading(true);
    try {
      const response = await api.getInvoices(search);
      setInvoices(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load invoices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices(searchTerm);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteInvoice(id);
      setInvoices(prev => prev.filter(inv => inv._id !== id));
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete invoice',
        variant: 'destructive',
      });
    }
    setDeleteId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (
    amount: number,
    currency: string = "USD",
    locale: string = "en-US"
  ): string => {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }).format(amount);
    } catch (e) {
      console.warn(`Unsupported currency/locale: ${currency} / ${locale}`);
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
      {/* Header */}
      <div className="container mx-auto px-4 mb-8 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900">Invoices</h1>
        <Link href="/invoices/new">
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
            <Plus className="h-5 w-5 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="container mx-auto px-4 mb-10">
        <form onSubmit={handleSearch} className="flex max-w-xl mx-auto gap-4">
          <Input
            placeholder="Search by vendor or invoice number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow"
          />
          <Button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Search className="h-4 w-4" />
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              loadInvoices();
            }}
          >
            Clear
          </Button>
        </form>
      </div>

      {/* Invoice List */}
      <div className="container mx-auto px-4 max-w-6xl">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg font-medium">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl mb-4">No invoices found</p>
            <Link href="/invoices/new">
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                Upload Your First Invoice
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {invoices.map((invoice) => (
              <Card key={invoice._id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold text-blue-700">
                    Invoice #{invoice.invoice.number || '-'}
                  </CardTitle>
                  <div className="text-sm text-gray-500">{invoice.createdAt ? formatDate(invoice.createdAt) : '-'}</div>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 flex items-center gap-2 text-gray-700">
                    <Calendar className="h-5 w-5" />
                    <span>{invoice.invoice.date ? formatDate(invoice.invoice.date) : '-'}</span>
                  </div>
                  <div className="mb-2 flex items-center gap-2 text-gray-700">
                    <DollarSign className="h-5 w-5" />
                    <span>{invoice.invoice.total ? formatCurrency(invoice.invoice.total, invoice.invoice.currency) : '-'}</span>
                  </div>
                  <div className="mb-4 text-gray-600">
                    Vendor: <span className="font-medium">{invoice.vendor.name || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <Link href={`/invoice/${invoice.fileId}`}>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Trash2 className="h-4 w-4 text-red-600" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this invoice? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(invoice._id!)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


