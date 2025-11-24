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
  onTotalsUpdate?: (totalAmount: number, transactionCount: number) => void;
}

export default function BillingHistory({ userId, onTotalsUpdate }: BillingHistoryProps) {
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setError(`Failed to load billing history: ${supabaseError.message}`);
          onTotalsUpdate?.(0, 0);
          return;
        }

        setBillingRecords(data || []);
        const records = data || [];
        const numericTotal = records.reduce((sum, r) => {
          let amt = 0;
          if (r.Amount == null) return sum;
          if (typeof r.Amount === 'number') amt = r.Amount;
          else {
            const cleaned = r.Amount.replace(/[$,C\$\s]/g, '');
            const parsed = parseFloat(cleaned);
            amt = isNaN(parsed) ? 0 : parsed;
          }
          return sum + amt;
        }, 0);
        onTotalsUpdate?.(numericTotal, records.length);
      } catch {
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
    let numAmount: number;
    if (typeof amount === 'string') {
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
        return 'bg-green-900/40 text-green-300';
      case 'pending':
        return 'bg-yellow-900/40 text-yellow-300';
      case 'failed':
        return 'bg-red-900/40 text-red-300';
      case 'refunded':
        return 'bg-blue-900/40 text-blue-300';
      default:
        return 'bg-zinc-700 text-zinc-300';
    }
  };

  return (
    <div className="flex-1 min-w-[320px] p-6 bg-zinc-900 text-zinc-200 rounded-xl shadow-md border border-zinc-700">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Billing History</h2>
        <p className="text-sm text-zinc-400">View all your past transactions and invoices</p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center items-center py-12 text-zinc-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2 mx-auto"></div>
          Loading billing history...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && billingRecords.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          No billing history found
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && billingRecords.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left py-3 px-4 font-semibold text-zinc-300">Invoice</th>
                <th className="text-left py-3 px-4 font-semibold text-zinc-300">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-zinc-300">Description</th>
                <th className="text-right py-3 px-4 font-semibold text-zinc-300">Amount</th>
                <th className="text-center py-3 px-4 font-semibold text-zinc-300">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-zinc-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {billingRecords.map((record, index) => (
                <tr
                  key={record.id}
                  className={`border-b border-zinc-800 hover:bg-zinc-800/70 transition ${
                    index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-800'
                  }`}
                >
                  <td className="py-4 px-4 text-zinc-300">
                    {record.Invoice ? (
                      <a
                        href={`#invoice-${record.Invoice}`}
                        className="text-blue-400 hover:underline"
                      >
                        {record.Invoice}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-4 px-4 text-white">{formatDate(record.Date)}</td>
                  <td className="py-4 px-4 text-zinc-300">{record.Description}</td>
                  <td className="py-4 px-4 text-right font-medium text-white">
                    {formatAmount(record.Amount)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        record.Status
                      )}`}
                    >
                      {record.Status.charAt(0).toUpperCase() + record.Status.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button className="text-blue-400 hover:underline text-sm font-medium">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {!isLoading && !error && billingRecords.length > 0 && (
        <div className="mt-6 pt-4 border-t border-zinc-700">
          <p className="text-sm text-zinc-400">
            Showing{' '}
            <span className="font-medium text-white">{billingRecords.length}</span>{' '}
            transactions
          </p>
        </div>
      )}
    </div>
  );
}
