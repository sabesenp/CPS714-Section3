"use client";

import { useState } from 'react';

// Props interface for clarity
interface SubscriptionPanelProps {
    currentPlan: any; // Using 'any' to match the state in payments.tsx
    formatValue: (value: any) => string;
    formatDate: (dateString: string) => string;
    userId: string;
    updateTierService: (userId: string, newTier: string, newStatus: string) => Promise<boolean>;
    onSubscriptionUpdate: () => void;
}

export default function SubscriptionPanel({ 
    currentPlan, 
    formatValue, 
    formatDate,
    userId,
    updateTierService,
    onSubscriptionUpdate,
}: SubscriptionPanelProps) {
  
  // State for managing the action message
  const [message, setMessage] = useState<{ title: string, body: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if currentPlan data has been loaded and is valid
  const isDataLoaded = currentPlan && currentPlan.plan_name;

  // Determine the display price string
  const priceDisplay = isDataLoaded && currentPlan.price !== null 
    ? `${formatValue(currentPlan.price)}/month`
    : 'N/A';
    
  const currentPlanName = isDataLoaded ? currentPlan.plan_name.toUpperCase() : 'LOADING...';
  const isActive = isDataLoaded && currentPlan.is_active;

  const getNextTier = (currentTier: string, direction: 'up' | 'down') => {
    const tiers = ['basic', 'premium', 'vip'];
    const currentIndex = tiers.indexOf(currentTier.toLowerCase());
    
    if (direction === 'up') return tiers[currentIndex + 1] || null;
    if (direction === 'down') return tiers[currentIndex - 1] || null;
    return null;
  };

  const handleAction = async (action: 'upgrade' | 'cancel' | 'downgrade' | 'reactivate') => {
    
    let newTier = currentPlan.plan_name;
    let newStatus = 'active';
    let msgTitle = '';
    let msgBody = '';
    let confirmMsg = '';

    const nextLowerTier = getNextTier(currentPlan.plan_name, 'down');
    const nextHigherTier = getNextTier(currentPlan.plan_name, 'up');

    if (action === 'cancel') {
        if (!isActive) return setMessage({ title: "Already Inactive", body: "This subscription is already canceled or inactive.", type: 'info' });
        newStatus = 'canceled';
        msgTitle = "Cancellation Confirmed";
        msgBody = `Your ${currentPlanName} plan is now CANCELED.`;
        confirmMsg = `Are you sure you want to cancel your ${currentPlanName} subscription?`;
    } 
    else if (action === 'reactivate') {
        if (isActive) return setMessage({ title: "Already Active", body: "Subscription is already active.", type: 'info' });
        newStatus = 'active';
        msgTitle = "Reactivation Successful!";
        msgBody = `Your ${currentPlanName} plan is now ACTIVE.`;
        confirmMsg = `Reactivate ${currentPlanName} plan?`;
    } 
    else if (action === 'upgrade') {
        if (!isActive) return setMessage({ title: "Action Blocked", body: "Cannot upgrade an inactive subscription.", type: 'error' });
        if (!nextHigherTier) return setMessage({ title: "Highest Tier", body: "You are already on the highest available plan (VIP).", type: 'info' });
        
        newTier = nextHigherTier;
        msgTitle = "Upgrade Successful!";
        msgBody = `Your plan has been upgraded to ${newTier.toUpperCase()}.`;
        confirmMsg = `Confirm upgrade to ${newTier.toUpperCase()}?`;
    } 
    else if (action === 'downgrade') {
        if (!isActive) return setMessage({ title: "Action Blocked", body: "Cannot downgrade an inactive subscription.", type: 'error' });
        if (!nextLowerTier) return setMessage({ title: "Lowest Tier", body: "You are already on the lowest available plan (BASIC).", type: 'info' });
        
        newTier = nextLowerTier;
        msgTitle = "Downgrade Successful!";
        msgBody = `Your plan has been downgraded to ${newTier.toUpperCase()}.`;
        confirmMsg = `Confirm downgrade to ${newTier.toUpperCase()}?`;
    }

    // Use window.confirm temporarily until a custom modal is implemented
    if (confirmMsg && !window.confirm(confirmMsg)) {
        return; 
    }

    setIsProcessing(true);
    setMessage(null);
    
    try {
        const success = await updateTierService(userId, newTier, newStatus);

        if (success) {
            setMessage({
                title: msgTitle,
                body: msgBody + " Reloading dashboard...",
                type: 'success',
            });
            onSubscriptionUpdate(); // Reload parent dashboard
        } else {
            setMessage({ title: "Action Failed", body: "Could not process request in the database.", type: 'error' });
        }
    } catch (error) {
        setMessage({ title: "Action Error", body: "An unexpected error occurred. See console.", type: 'error' });
    } finally {
        setIsProcessing(false);
    }
  };


  return (
    <div className="flex-1 min-w-[320px] p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-gray-100 dark:border-zinc-700 relative">
      
      {/* Action Message Box (Replaces alert/confirm) */}
      {/* Implementation of the custom message box is crucial as per instructions */}
      {message && (
        <div className={`absolute top-0 left-0 right-0 p-4 border-l-4 rounded-t-xl z-10 
            ${message.type === 'success' ? 'bg-green-100 border-green-500 dark:bg-green-900' : 
              message.type === 'error' ? 'bg-red-100 border-red-500 dark:bg-red-900' : 
              'bg-yellow-100 border-yellow-500 dark:bg-yellow-900'}`}>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{message.title}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{message.body}</p>
          <button 
            onClick={() => setMessage(null)}
            className="absolute top-1 right-2 text-xl font-bold text-gray-700 dark:text-gray-300"
          >&times;</button>
        </div>
      )}

      {/* Header and Status Badge */}
      <div className="flex justify-between items-start mb-4">
        <div className='flex flex-col'>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Current Subscription</h2>
          <p className="text-sm text-gray-600 dark:text-zinc-400">Manage your membership plan and billing</p>
        </div>
        {/* If data is loaded and is_active is true, show Active */}
        {isActive ? (
          <span className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:text-green-300 dark:bg-green-900 self-start">
            Active
          </span>
        ) : (
          <span className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full dark:text-red-300 dark:bg-red-900 self-start">
            Inactive
          </span>
        )}
      </div>

      {/* Plan Name and Price */}
      <div className="flex justify-between items-end mb-6 border-b border-gray-200 dark:border-zinc-700 pb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {currentPlanName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Billed {isDataLoaded ? currentPlan.billing_cycle : 'N/A'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {priceDisplay}
          </p>
          <p className="text-xs text-gray-400 dark:text-zinc-500">
            CAD
          </p>
        </div>
      </div>

      {/* Member Since and Next Renewal Info */}
      <div className="flex justify-start space-x-12 text-sm mb-8">
        {/* Member Since */}
        <div className="flex flex-col">
          <p className="font-medium text-gray-700 dark:text-zinc-300 mb-2">Member Since</p>
          <div className="flex items-center space-x-2 text-gray-500 dark:text-zinc-400">
            <p>{isDataLoaded ? formatDate(currentPlan.member_since) : '...'}</p>
          </div>
        </div>
        {/* Next Renewal */}
        <div className="flex flex-col">
          <p className="font-medium text-gray-700 dark:text-zinc-300 mb-2">Next Renewal</p>
          <div className="flex items-center space-x-2 text-gray-500 dark:text-zinc-400">
            <p>{isDataLoaded ? formatDate(currentPlan.next_renewal) : '...'}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons Row 1 (Upgrade/Cancel) */}
      <div className="flex space-x-4 mb-4">
        <button 
          onClick={() => handleAction('upgrade')}
          disabled={isProcessing || !isDataLoaded || currentPlanName === 'VIP'}
          className="flex-1 flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-800 dark:text-zinc-200 font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Loading...' : 'Upgrade Plan'}
        </button>
        <button 
          onClick={() => handleAction('cancel')}
          disabled={isProcessing || !isDataLoaded || !isActive}
          className="flex-1 flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-800 dark:text-zinc-200 font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Loading...' : 'Cancel Subscription'}
        </button>
      </div>

      {/* Action Buttons Row 2 (Downgrade/Reactivate) */}
      <div className="flex space-x-4">
        <button 
          onClick={() => handleAction('downgrade')}
          disabled={isProcessing || !isDataLoaded || currentPlanName === 'BASIC' || !isActive}
          className="flex-1 flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-800 dark:text-zinc-200 font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Loading...' : 'Downgrade Plan'}
        </button>
        <button 
          onClick={() => handleAction('reactivate')}
          disabled={isProcessing || !isDataLoaded || isActive}
          className="flex-1 flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-zinc-700 rounded-lg text-indigo-600 dark:text-indigo-400 font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Loading...' : 'Reactivate Plan'}
        </button>
      </div>

    </div>
  );
}