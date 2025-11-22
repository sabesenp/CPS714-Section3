"use client";

import { useState } from 'react';
import { SubscriptionType } from '../lib/dataService'; 

// Props interface for clarity
interface SubscriptionPanelProps {
    currentPlan: SubscriptionType | any; 
    formatValue: (value: any) => string;
    formatDate: (dateString: string) => string;
    userId: string;
    updateTierService: (userId: string, newTier: string, newStatus: string, currentBalance: number, price: number) => Promise<{ success: boolean, message: string }>;
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

    // Determine the price display
    const priceDisplay = isDataLoaded && currentPrice !== null 
        ? `${formatValue(currentPrice)}/month`
        : 'N/A';

    // --- Action Handlers ---

    const handleAction = async (action: 'upgrade' | 'downgrade' | 'cancel' | 'reactivate') => {
        if (!currentTier || !isDataLoaded) return;

        setIsProcessing(true);
        setStatusMessage(null);
        
        const tierIndex = TIER_HIERARCHY.indexOf(currentTier);
        let newTier = currentTier;
        let newStatus = currentStatus;
        let priceToCheck = currentPrice;
        
        // --- LOGIC EXECUTION ---
        if (action === 'upgrade' || action === 'downgrade') {
            const nextIndex = action === 'upgrade' ? tierIndex + 1 : tierIndex - 1;
            newTier = TIER_HIERARCHY[nextIndex];
            newStatus = 'active'; // Upgrading activates the membership
            priceToCheck = currentPrice; // Balance check uses current price for simplicity

            if (!newTier) {
                setStatusMessage({ type: 'error', message: `Cannot ${action}: No tier available.` });
                setIsProcessing(false);
                return;
            }
        } else if (action === 'cancel') {
            newStatus = 'canceled';
            newTier = currentTier;
            priceToCheck = 0; // Cancellation is free
        } else if (action === 'reactivate') {
            // ACTION: Ensure status is set to active and price is checked
            newStatus = 'active';
            newTier = currentTier;
            priceToCheck = currentPrice; // Reactivation costs the monthly fee
        }

        // --- Execute Supabase Update (Includes Balance Check and Date Reset) ---
        try {
            // The service function handles: 1) Balance check, 2) Date setting (start/end), 3) DB write
            const result = await updateTierService(userId, newTier, newStatus, currentBalance, priceToCheck);
            
            if (result.success) {
                setStatusMessage({ type: 'success', message: `Subscription successfully ${newStatus === 'active' ? 'updated/activated' : 'canceled'}.` });
                onSubscriptionUpdate(); // RELOAD PARENT DATA
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
        <div className="flex-1 min-w-[320px] p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-gray-100 dark:border-zinc-700">
            
            {/* Header and Status Badge */}
            <div className="flex justify-between items-start mb-4">
                <div className='flex flex-col'>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Current Subscription</h2>
                    <p className="text-sm text-gray-600 dark:text-zinc-400">Manage your membership plan and billing</p>
                </div>
                {/* Status Badge */}
                {isDataLoaded && currentPlan.is_active ? (
                    <span className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:text-green-300 dark:bg-green-900 self-start">
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
                        Billed {isDataLoaded ? currentPlan.billing_cycle : 'N/A'}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {/* Price display uses the conditional priceDisplay logic */}
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
                <div className={`p-3 my-4 rounded-lg text-sm font-medium ${statusMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {isProcessing ? 'Processing request...' : statusMessage.message}
                </div>
            )}

            {/* --- Action Buttons Row 1: Upgrade & Cancel --- */}
            <div className="flex space-x-4 mt-8">
                <button 
                    onClick={() => handleAction('upgrade')}
                    className="flex-1 flex justify-center items-center py-2 px-4 border border-indigo-500 bg-indigo-500 text-white rounded-lg font-medium transition disabled:bg-gray-300 disabled:border-gray-300 hover:bg-indigo-600"
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
                    className="flex-1 flex justify-center items-center py-2 px-4 border border-green-500 text-green-600 rounded-lg font-medium hover:bg-green-50 dark:hover:bg-green-900 transition disabled:opacity-50"
                    disabled={isProcessing || !canReactivate}
                >
                    {isProcessing && canReactivate ? 'Activating...' : 'Reactivate Plan'}
                </button>
            </div>
        </div>
    );
}