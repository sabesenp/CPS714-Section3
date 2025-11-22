"use client";

import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';

import { 
    fetchTestValue, 
    fetchSubscriptionData, 
    formatValue, 
    formatDate,
    SubscriptionType,
    updateUserBalance,
    updateMembershipTier,
} from '../lib/dataService'; 

import PaymentForm from './PaymentForm';
import SubscriptionPanel from './SubscriptionPanel';
import BillingHistory from './BillingHistory';

export default function PaymentsAndBilling() {

  // Reusing the SubscriptionType definition from above for consistency
  type CurrentSubscriptionType = SubscriptionType;

  const [subscription, setSubscription] = useState<CurrentSubscriptionType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [testValue, setTestValue] = useState<string>('Checking Connection...');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const mockUserId = '49f7c14c-1c83-49fc-8701-38043efdb920'; 
  
  const reloadDashboardData = useCallback(async () => {
    if (!mockUserId) { 
        setLoading(false); 
        setTestValue('User ID Missing');
        return; 
    }
    setLoading(true);
    setError(null);

    try {
        const testResult = await fetchTestValue(mockUserId);
        setTestValue(testResult);
        
        const subData = await fetchSubscriptionData(mockUserId);
        setSubscription(subData);
        
    } catch (err: any) {
        console.error("Dashboard Load Error:", err);
        setError("Failed to load dashboard data: " + err.message);
    } finally {
        setLoading(false);
    }
  }, [mockUserId]);
  
  // Initial load hook (calls the reusable function)
  useEffect(() => {
    reloadDashboardData();
  }, [reloadDashboardData]);
    
  if (loading) return <div className="flex justify-center w-full min-h-screen items-center text-gray-500">Loading payment and billing data...</div>;
  if (error) return <div className="flex justify-center w-full min-h-screen items-center text-red-500">Error: {error}</div>;

  const currentPlan = subscription || {} as CurrentSubscriptionType;

  // Now, TypeScript knows currentPlan either has the SubscriptionType properties (if loaded) 
  // or it's the fallback object we created (which also satisfies the type).
  // This line is now safe and correct:
  const balance = currentPlan.balance ?? 0; 
  const balanceStatus = balance >= 0 ? "Credit / Prepaid" : "Balance Due";
  
  // Format the balance for display
  const formattedBalance = formatValue(Math.abs(balance));

  return (
    <div className="flex justify-center w-full min-h-screen bg-gray-50 dark:bg-black p-8 sm:p-12 font-sans">
      
      <div className="w-full max-w-6xl">
        
        {/* Title */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Payment & Billing
          </h1>
          <p className="text-lg text-gray-600 dark:text-zinc-400">
            Manage your payments, subscriptions, and billing history
          </p>
        </header>

        {/* SECTION 1: SUMMARY CARDS (Top Row) */}
        <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          
          {/*SUPABASE CONNECTION TEST*/}
          <div className="h-32 p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700">
            <p className="text-base font-semibold text-gray-700 dark:text-zinc-300 mb-2">Current Balance</p>
             <p className={`text-2xl font-bold ${balance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                 {balance < 0 ? "-" : ""}
                 {formattedBalance}
             </p>
             <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{balanceStatus}</p>
          </div>
          {/* Empty Box Placeholders */}
          <div className="h-32 p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700"></div>
          <div className="h-32 p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700"></div>
          <div className="h-32 p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700"></div>

        </section>

        <hr className="my-10 border-gray-200 dark:border-zinc-700" />

        {/* SECTION 2: DETAIL PANELS (Bottom Row) */}
        <section className="w-full flex flex-col md:flex-row gap-6">
          
          {/* LEFT BOX: Current Subscription Panel */}
          <SubscriptionPanel 
            currentPlan={currentPlan}
            formatValue={formatValue}
            formatDate={formatDate}
            userId={mockUserId} // Pass userId for update
            updateTierService={updateMembershipTier} // Pass upgrade/cancel logic
            onSubscriptionUpdate={reloadDashboardData} // Pass reload trigger
          />

          {/* RIGHT BOX: Make a Payment Form */}
          <PaymentForm
            paymentMethods={paymentMethods}
            // MISSING PROPS: The PaymentForm requires userId, updateBalanceService, and onPaymentSuccess props to be functional.
            userId={mockUserId}
            updateBalanceService={updateUserBalance}
            onPaymentSuccess={reloadDashboardData}
            />

        </section>

        {/* Billing History Section */}
        <section className="w-full mt-8">
          <BillingHistory userId={mockUserId} />
        </section>

      </div>
    </div>
  );
}