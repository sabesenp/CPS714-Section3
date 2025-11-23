"use client";

import { supabase } from '../lib/supabase';
import { useState, useEffect } from 'react';

interface BillingRecord {
  id: string;
  Amount: number | string;
  Status: string;
  Date: string;
  Description: string;
  Invoice: string;
  Actions?: string;
}

interface BillingHistoryProps {
  userId?: string;
  onTotalsUpdate?: (totalAmount: number, transactionCount: number) => void; //callback for total payment card
}

export default function BillingHistory({ userId, onTotalsUpdate }: BillingHistoryProps) {
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('BillingHistory component received userId:', userId);

  useEffect(() => {
    const fetchBillingHistory = async () => {
      if (!userId || userId.trim() === '') {
        setError('User ID is missing');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { data, error: supabaseError } = await supabase
          .from('billing-history')
          .select('*')
          .eq('user_id', userId)
          .order('Date', { ascending: false });

        if (supabaseError) {
          console.error('Supabase billing history fetch error:', supabaseError);
          setError(`Failed to load billing history: ${supabaseError.message}`);
          // notify parent of zero totals on error
          onTotalsUpdate?.(0, 0);
          return;
        }

        setBillingRecords(data || []);
        console.log('Billing records loaded:', data);
        // compute numeric total and count, then notify parent
        const records = data || [];
        const numericTotal = records.reduce((sum, r) => {
          let amt = 0;
          if (r.Amount == null) return sum;
          if (typeof r.Amount === 'number') amt = r.Amount;
          else if (typeof r.Amount === 'string') {
            const cleaned = r.Amount.replace(/[$,C\$\s]/g, '');
            const parsed = parseFloat(cleaned);
            amt = isNaN(parsed) ? 0 : parsed;
          }
          return sum + amt;
        }, 0);
        onTotalsUpdate?.(numericTotal, records.length);
      } catch (err) {
        console.error('Error fetching billing history:', err);
        setError('An unexpected error occurred');
        onTotalsUpdate?.(0, 0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillingHistory();
  }, [userId]);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount: number | string | null): string => {
    if (!amount) return '$0.00';
    
    // If it's a string, remove any currency symbols and parse it
    let numAmount: number;
    if (typeof amount === 'string') {
      // Remove dollar signs, commas, and other common currency symbols
      const cleaned = amount.replace(/[$,\s]/g, '');
      numAmount = parseFloat(cleaned);
    } else {
      numAmount = amount;
    }
    
    return isNaN(numAmount) ? '$0.00' : `$${numAmount.toFixed(2)}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'refunded':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="flex-1 min-w-[320px] p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-gray-100 dark:border-zinc-700">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Billing History</h2>
        <p className="text-sm text-gray-600 dark:text-zinc-400">View all your past transactions and invoices</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500 dark:text-zinc-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-2 mx-auto"></div>
            Loading billing history...
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
          {!userId && <p className="text-sm mt-2">Note: userId received: {userId}</p>}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && billingRecords.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-zinc-400">No billing history found</p>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && billingRecords.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-zinc-300">Invoice</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-zinc-300">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-zinc-300">Description</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-zinc-300">Amount</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-zinc-300">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-zinc-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {billingRecords.map((record, index) => (
                <tr
                  key={record.id}
                  className={`border-b border-gray-100 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition ${
                    index % 2 === 0 ? 'bg-white dark:bg-zinc-800' : 'bg-gray-50 dark:bg-zinc-800/50'
                  }`}
                >
                  <td className="py-4 px-4 text-gray-600 dark:text-zinc-400">
                    {record.Invoice ? (
                      <a
                        href={`#invoice-${record.Invoice}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {record.Invoice}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-4 px-4 text-gray-900 dark:text-white">
                    {formatDate(record.Date)}
                  </td>
                  <td className="py-4 px-4 text-gray-700 dark:text-zinc-300">
                    {record.Description}
                  </td>
                  <td className="py-4 px-4 text-right font-medium text-gray-900 dark:text-white">
                    {formatAmount(record.Amount)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(record.Status)}`}>
                      {record.Status.charAt(0).toUpperCase() + record.Status.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Footer (optional) */}
      {!isLoading && !error && billingRecords.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-zinc-700">
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            Showing <span className="font-medium text-gray-900 dark:text-white">{billingRecords.length}</span> transactions
          </p>
        </div>
      )}
    </div>
  );
}
