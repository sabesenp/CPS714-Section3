"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
    fetchTestValue, 
    fetchSubscriptionData, 
    fetchPaymentMethods,
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

  // STATE: All application state needed for the UI and fetching is correctly defined.
  const [subscription, setSubscription] = useState<CurrentSubscriptionType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [testValue, setTestValue] = useState<string>('Checking Connection...');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]); 
  const [totalPayments, setTotalPayments] = useState<string>(formatValue(0));
  const [transactions, setTransactions] = useState<number>(0);


  const mockUserId = '49f7c14c-1c83-49fc-8701-38043efdb920'; 
  
  // handler passed to BillingHistory to receive totals
  const handleBillingTotals = (totalAmount: number, txnCount: number) => {
    setTotalPayments(formatValue(totalAmount));
    setTransactions(txnCount);
  };

  // CORE FUNCTION: Fetches all dashboard data and updates state.
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
        
        // Fetch both subscription data and mock payment methods concurrently
        const [subData, pmData] = await Promise.all([
            fetchSubscriptionData(mockUserId),
            fetchPaymentMethods(mockUserId)
        ]);

        setSubscription(subData);
        setPaymentMethods(pmData);
        
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

  // FALLBACK/TYPE ASSERTION: Correctly handles null subscription object.
  const currentPlan = subscription || {} as SubscriptionType;

  // BALANCE CALCULATION: Correctly handles null balance from DB by defaulting to 0.
  const balance = currentPlan.balance ?? 0; 
  const balanceStatus = balance >= 0 ? "Credit / Prepaid" : "Balance Due";
  
  // Format the balance for display
  const formattedBalance = formatValue(Math.abs(balance));

  // Use already-loaded subscription information for the cards
  const nextPaymentAmount = currentPlan.price != null ? formatValue(currentPlan.price) : 'N/A';
  const nextPaymentDate = currentPlan.next_renewal ? formatDate(currentPlan.next_renewal) : 'N/A';
  const paymentPlan = currentPlan.plan_name ? currentPlan.plan_name.toUpperCase() : 'N/A';
  const billingCycle = currentPlan.recurring ? currentPlan.recurring.toUpperCase() : 'N/A';

  // FIX: Utility function to safely narrow the string to 'monthly' or 'annual'
  const getSafeRecurringCycle = (cycle: string | null): 'monthly' | 'annual' => {
      const lower = cycle?.toLowerCase();
      if (lower === 'monthly' || lower === 'annual') {
          return lower;
      }
      return 'monthly'; // Default to monthly if invalid or null
  }

  return (
    <div className="flex justify-center w-full min-h-screen bg-black p-8 sm:p-12 font-sans">
      
      <div className="w-full max-w-6xl">
        
        {/* Title is correct */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            Payment & Billing
          </h1>
          <p className="text-lg text-gray-400">
            Manage your payments, subscriptions, and billing history
          </p>
        </header>

        {/* SECTION 1: SUMMARY CARDS (Top Row) */}
        <section className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          
          {/* 🟢 Box 1: CURRENT BALANCE */}
          <div className="h-32 p-6 bg-gray-900 rounded-xl shadow-md border border-gray-800">
             <p className="text-base font-semibold text-amber-500 mb-2">Current Balance</p>
             <p className={`text-2xl font-bold ${balance < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                 {balance < 0 ? "-" : ""}
                 {formattedBalance}
             </p>
             <p className="text-xs text-gray-400 mt-1">{balanceStatus}</p>
          </div>
          
          {/* 🟡 Box 2: NEXT PAYMENT */}
          <div className="h-32 p-6 bg-gray-900 rounded-xl shadow-md border border-gray-800">
             <p className="text-base font-semibold text-gray-400 mb-2">Next Payment</p>
             <p className="text-2xl font-bold text-gray-100">{nextPaymentAmount}</p>
             <p className="text-xs text-gray-500 mt-1">Due {nextPaymentDate}</p>
          </div>
          
          {/* 🔵 Box 3: ACTIVE SUBSCRIPTION */}
          <div className="h-32 p-6 bg-gray-900 rounded-xl shadow-md border border-gray-800">
             <p className="text-base font-semibold text-gray-400 mb-2">Active Subscription</p>
             <p className="text-2xl font-bold text-gray-100">{paymentPlan}</p>
             <p className="text-xs text-gray-500 mt-1">Billed {billingCycle}</p>
          </div>
          
          {/* 🔴 Box 4: TOTAL PAYMENTS */}
          <div className="h-32 p-6 bg-gray-900 rounded-xl shadow-md border border-gray-800">
             <p className="text-base font-semibold text-gray-400 mb-2">Total Payments (2025)</p>
             <p className="text-2xl font-bold text-gray-100">{totalPayments}</p>
             <p className="text-xs text-gray-500 mt-1">{transactions} transactions</p>
          </div>

        </section>

        <hr className="my-10 border-gray-800" />

        {/* SECTION 2: DETAIL PANELS (Bottom Row) */}
        <section className="w-full flex flex-col md:flex-row gap-6">
          
          {/* LEFT BOX: Current Subscription Panel */}
          <SubscriptionPanel 
            currentPlan={currentPlan}
            formatValue={formatValue}
            formatDate={formatDate}
            userId={mockUserId} 
            updateTierService={updateMembershipTier} 
            onSubscriptionUpdate={reloadDashboardData} 
          />

          {/* RIGHT BOX: Make a Payment Form */}
          <PaymentForm
            currentPlan={currentPlan} 
            // FIX: Use the safe utility function to ensure type is 'monthly' or 'annual'
            currentRecurring={getSafeRecurringCycle(currentPlan.recurring)} 
            paymentMethods={paymentMethods}
            userId={mockUserId}
            updateBalanceService={updateUserBalance}
            onPaymentSuccess={reloadDashboardData}
          />

        </section>

        {/* Billing History Section */}
        <section className="w-full mt-8">
          <BillingHistory userId={mockUserId} onTotalsUpdate={handleBillingTotals}/>
        </section>

      </div>
    </div>
  );
}