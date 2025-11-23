"use client";

import { useState } from 'react';

// Props interface for clarity
interface SubscriptionPanelProps {
    currentPlan: any; 
    formatValue: (value: any) => string;
    formatDate: (dateString: string) => string;
    userId: string;
    // Service function to update tier/status, checks balance, and updates dates
    updateTierService: (
        userId: string, 
        newTier: string, 
        newStatus: string, 
        currentBalance: number, 
        price: number,
        action: 'upgrade' | 'reactivate' | 'downgrade' | 'cancel' | 'cycle',
        newRecurringCycle: 'monthly' | 'annual'
    ) => Promise<{ success: boolean, message: string }>;
    onSubscriptionUpdate: () => void; // Function to reload parent data
}

// Define available tiers and their hierarchy for upgrade/downgrade logic
const TIER_HIERARCHY: string[] = ['basic', 'premium', 'vip'];

export default function SubscriptionPanel({ currentPlan, formatValue, formatDate, userId, updateTierService, onSubscriptionUpdate }: SubscriptionPanelProps) {
    
    const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', message: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Check if currentPlan data has been loaded and is valid (needed to prevent errors on null data)
    const isDataLoaded = currentPlan && currentPlan.plan_name;
    const currentTier = currentPlan.plan_name?.toLowerCase();
    const currentStatus = currentPlan.is_active ? 'active' : (currentPlan.status?.toLowerCase() === 'canceled' ? 'canceled' : 'inactive');
    const currentBalance = currentPlan.balance ?? 0;
    const currentPrice = currentPlan.price ?? 0;
    const currentRecurring = currentPlan.billing_cycle === 'annual' ? 'annual' : 'monthly';

    // Determine the price display
    const priceDisplay = isDataLoaded && currentPrice !== null 
        ? `${formatValue(currentPrice)}/month`
        : 'N/A';

    // --- Action Handlers ---

    const handleAction = async (action: 'upgrade' | 'downgrade' | 'cancel' | 'reactivate' | 'cycle') => {
        if (!currentTier || !isDataLoaded) return;

        setIsProcessing(true);
        setStatusMessage(null);
        
        const tierIndex = TIER_HIERARCHY.indexOf(currentTier);
        let newTier = currentTier;
        let newStatus = currentStatus;
        let priceToCheck = currentPrice; 
        let newRecurringCycle: 'monthly' | 'annual' = currentRecurring;

        // --- LOGIC EXECUTION ---
        if (action === 'upgrade') {
            const nextIndex = tierIndex + 1;
            newTier = TIER_HIERARCHY[nextIndex];
            newStatus = 'active'; 
            
            if (!newTier) {
                setStatusMessage({ type: 'error', message: `Cannot upgrade: Already on top tier.` });
                setIsProcessing(false);
                return;
            }
        } else if (action === 'downgrade') {
            const nextIndex = tierIndex - 1;
            newTier = TIER_HIERARCHY[nextIndex];
            newStatus = 'active'; 
            priceToCheck = 0; // Downgrade is free and bypasses balance check

            if (!newTier) {
                setStatusMessage({ type: 'error', message: `Cannot downgrade: Already on lowest tier.` });
                setIsProcessing(false);
                return;
            }
        } else if (action === 'cancel') {
            newStatus = 'canceled';
            newTier = currentTier;
            priceToCheck = 0; // Cancellation is free
        } else if (action === 'reactivate') {
            // Reactivation sets status to active and requires the monthly fee
            newStatus = 'active';
            newTier = currentTier;
            priceToCheck = currentPrice; 
        } else if (action === 'cycle') {
             // Cycle change is generally free, but changes the billing cycle.
             newRecurringCycle = currentRecurring === 'monthly' ? 'annual' : 'monthly';
             priceToCheck = 0;
             newTier = currentTier;
             newStatus = currentStatus;
        }

        // --- Execute Supabase Update (Includes Balance Check and Date Reset) ---
        try {
            // The service function handles: 1) Balance check, 2) Date setting, 3) DB write
            const result = await updateTierService(userId, newTier, newStatus, currentBalance, priceToCheck, action, newRecurringCycle);
            
            if (result.success) {
                setStatusMessage({ type: 'success', message: `Subscription successfully ${action === 'cancel' ? 'canceled' : (action === 'cycle' ? 'cycle updated' : 'updated/activated')}.` });
                onSubscriptionUpdate(); // RELOAD PARENT DATA TO UPDATE DATES/BALANCE
            } else {
                // This handles the "Insufficient balance" message from dataService.ts
                setStatusMessage({ type: 'error', message: result.message });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', message: "A server error occurred during the update." });
        } finally {
            setIsProcessing(false);
        }
    };
    
    // --- Conditional Button Status ---

    const canUpgrade = currentStatus === 'active' && TIER_HIERARCHY.indexOf(currentTier) < TIER_HIERARCHY.length - 1;
    const canDowngrade = currentStatus === 'active' && TIER_HIERARCHY.indexOf(currentTier) > 0;
    const canCancel = currentStatus === 'active';
    const canReactivate = currentStatus === 'canceled' || currentStatus === 'inactive';
    
    const isReady = !isProcessing && isDataLoaded;

    return (
        // ACTION: Added subscription-panel class
        <div className="flex-1 min-w-[320px] p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-gray-100 dark:border-zinc-700 subscription-panel">
            
            {/* Header and Status Badge */}
            <div className="flex justify-between items-start mb-4">
                <div className='flex flex-col'>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Current Subscription</h2>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">Manage your membership plan and billing</p>
                </div>
                {/* Status Badge */}
                {isDataLoaded && currentPlan.is_active ? (
                    <span className="px-3 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full dark:text-yellow-300 dark:bg-yellow-900 self-start">
                        Active
                    </span>
                ) : (
                    <span className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full dark:text-red-300 dark:bg-red-900 self-start">
                        {currentStatus === 'canceled' ? 'Canceled' : 'Inactive'}
                    </span>
                )}
            </div>

            {/* Plan Name and Price */}
            <div className="flex justify-between items-end mb-6 border-b border-gray-200 dark:border-zinc-700 pb-4">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {isDataLoaded ? currentPlan.plan_name.toUpperCase() : 'Loading Plan...'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                        Billed {isDataLoaded ? currentRecurring.toUpperCase() : 'N/A'}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {isDataLoaded && currentPrice !== null ? priceDisplay : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">
                        CAD
                    </p>
                </div>
            </div>

            {/* Member Since and Next Renewal Info */}
            <div className="flex justify-start space-x-12 text-sm mb-4">
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
            
            {/* --- Status Message Alert --- */}
            {statusMessage && (
                <div className={`p-3 my-4 rounded-lg text-sm font-medium ${statusMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'}`}>
                    {isProcessing ? 'Processing request...' : statusMessage.message}
                </div>
            )}

            {/* --- Billing Cycle Switch --- */}
            <div className="flex justify-end mb-4">
                <button 
                    onClick={() => handleAction('cycle')}
                    className="text-sm text-yellow-600 dark:text-yellow-300 hover:underline transition disabled:opacity-50"
                    disabled={isProcessing}
                >
                    Switch to {currentRecurring === 'monthly' ? 'Annual' : 'Monthly'} Billing
                </button>
            </div>

            {/* --- Action Buttons Row 1: Upgrade & Cancel --- */}
            <div className="flex space-x-4">
                <button 
                    onClick={() => handleAction('upgrade')}
                    className="flex-1 flex justify-center items-center py-2 px-4 btn-primary rounded-lg font-medium transition disabled:opacity-50"
                    disabled={isProcessing || !canUpgrade}
                >
                    {isProcessing && canUpgrade ? 'Upgrading...' : 'Upgrade Plan'}
                </button>
                <button 
                    onClick={() => handleAction('cancel')}
                    className="flex-1 flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition disabled:opacity-50"
                    disabled={isProcessing || !canCancel}
                >
                    Cancel Subscription
                </button>
            </div>
            
            {/* --- Action Buttons Row 2: Downgrade & Reactivate --- */}
            <div className="flex space-x-4 mt-2">
                <button 
                    onClick={() => handleAction('downgrade')}
                    className="flex-1 flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition disabled:opacity-50"
                    disabled={isProcessing || !canDowngrade}
                >
                    Downgrade Plan
                </button>
                <button 
                    onClick={() => handleAction('reactivate')}
                    className="flex-1 flex justify-center items-center py-2 px-4 border border-yellow-500 text-yellow-600 rounded-lg font-medium hover:bg-yellow-50 dark:hover:bg-yellow-900 transition disabled:opacity-50"
                    disabled={isProcessing || !canReactivate}
                >
                    {isProcessing && canReactivate ? 'Activating...' : 'Reactivate Plan'}
                </button>
            </div>
        </div>
    );
}