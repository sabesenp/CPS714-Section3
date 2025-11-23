"use client";

import { useState } from 'react';
import { updateMembershipTier, SubscriptionType } from '../lib/dataService'; 

interface PaymentMethod {
    id: number;
    card_type: string;
    last_four: string;
    is_default: boolean;
}

// ACTION: Loosening the currentRecurring type to string (as requested)
interface PaymentFormProps {
    currentPlan: SubscriptionType; 
    paymentMethods: PaymentMethod[];
    userId: string;
    updateBalanceService: (userId: string, amount: number) => Promise<boolean>;
    onPaymentSuccess: () => void;
    // FIX: Changed to allow any string, resolving the TypeScript error
    currentRecurring: string; 
}

// Helper to safely coerce the string to a valid cycle for function calls
const getValidCycle = (cycle: string): 'monthly' | 'annual' => {
    const lower = cycle.toLowerCase();
    if (lower === 'annual') return 'annual';
    return 'monthly'; // Default to monthly if anything else is passed
};

// ACTION: Updated function signature to accept currentPlan
export default function PaymentForm({ currentPlan, paymentMethods, userId, updateBalanceService, onPaymentSuccess, currentRecurring }: PaymentFormProps) {
    // --- Form State ---
    const [cardholderName, setCardholderName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expDate, setExpDate] = useState('');
    const [cvc, setCvc] = useState('');
    const [amount, setAmount] = useState(0.00);
    
    // --- UI State ---
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', message: string } | null>(null);
    
    // Local state for the toggle UI, initialized from parent prop, using the safe helper
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(getValidCycle(currentRecurring));


    const formatValue = (value: number) => {
        // Simple formatter for local display, matching the currency defined in dataService.ts (CAD)
        return `C$${value.toFixed(2)}`;
    };

    // --- Validation and Formatting Helpers ---

    const validateForm = () => {
        if (amount <= 0) return "Please enter an amount greater than zero.";
        if (cardholderName.trim() === '') return "Cardholder name is required.";
        // Simple validation checks for required fields
        if (cardNumber.replace(/\s/g, '').length !== 16) return "Card number must be 16 digits.";
        if (cvc.length !== 3) return "CVC must be 3 digits.";
        if (expDate.length !== 5 || !expDate.includes('/')) return "Expiration date must be MM/YY (e.g., 12/25).";
        return null;
    };

    const formatCardNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        return cleaned.match(/.{1,4}/g)?.join(' ').slice(0, 19) || '';
    };

    const formatExpDate = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length > 2) {
            return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
        }
        return cleaned;
    };

    // --- Action Handler ---

    // Handler for the payment button (updates balance)
    const handleProcessPayment = async () => {
        const validationError = validateForm();
        if (validationError) {
            setStatusMessage({ type: 'error', message: validationError });
            return;
        }

        setIsProcessing(true);
        setStatusMessage(null);
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
            // Call the service to update the user's balance in the database
            const success = await updateBalanceService(userId, amount);

            if (success) {
                setStatusMessage({ type: 'success', message: `Payment of ${formatValue(amount)} successful! Credit balance updated.` });
                onPaymentSuccess();
                // Clear form fields on success
                setCardholderName('');
                setCardNumber('');
                setExpDate('');
                setCvc('');
                setAmount(0.00); 

            } else {
                setStatusMessage({ type: 'error', message: "Payment processed, but database update failed." });
            }
        } catch (e) {
            setStatusMessage({ type: 'error', message: "A network error occurred during payment processing." });
        } finally {
            setIsProcessing(false);
        }
    };
    
    // Handler for the toggle switch (updates recurring field in DB)
    const handleToggleCycle = async () => {
        const newCycle = billingCycle === 'monthly' ? 'annual' : 'monthly';
        
        setIsProcessing(true);
        setStatusMessage(null);
        
        try {
             // Use currentPlan properties needed for the service call
             const result = await updateMembershipTier(
                userId, 
                currentPlan.plan_name ?? 'basic', // FIX: Safely coalesce plan_name to a non-null string ('basic')
                currentPlan.is_active ? 'active' : 'inactive', 
                currentPlan.balance ?? 0, 
                0, // Price check is 0
                'cycle', // Action type
                newCycle
            );

            if (result.success) {
                setStatusMessage({ type: 'success', message: `Billing cycle successfully switched to ${newCycle.toUpperCase()}.` });
                setBillingCycle(newCycle); // Update local state for UI
                onPaymentSuccess(); // Reload parent data
            } else {
                 setStatusMessage({ type: 'error', message: result.message });
            }
        } catch (error) {
            setStatusMessage({ type: 'error', message: "A server error occurred during the cycle switch." });
        } finally {
            setIsProcessing(false);
        }
    };


    return (
        // ACTION: Uses payment-panel class for custom styling
        <div className="flex-1 min-w-[320px] p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-gray-100 dark:border-zinc-700 payment-panel">

            {/* Header */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Make a Payment</h2>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">Securely process a one-time payment or add credit.</p>

            {/* Status Message */}
            {statusMessage && (
                <div className={`p-3 my-4 rounded-lg text-sm font-medium ${statusMessage.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {isProcessing ? 'Processing request...' : statusMessage.message}
                </div>
            )}

            {/* Amount Input */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Amount (CAD)</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-zinc-400">C$</span>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-white"
                        placeholder="0.00"
                    />
                </div>
            </div>
            
            {/* Card Holder Name */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Cardholder Name</label>
                <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-white"
                    placeholder="Jane Doe (Simulation)" // UPDATED PLACEHOLDER
                />
            </div>
            
            {/* Card Number */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Card Number</label>
                <input
                    type="text"
                    value={formatCardNumber(cardNumber)}
                    onChange={(e) => setCardNumber(e.target.value)}
                    maxLength={19}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-white"
                    placeholder="4444 4444 4444 4444" // UPDATED PLACEHOLDER
                />
            </div>

            {/* Expiration and CVC */}
            <div className="flex space-x-4 mb-6">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Expiration (MM/YY)</label>
                    <input
                        type="text"
                        value={formatExpDate(expDate)}
                        onChange={(e) => setExpDate(e.target.value)}
                        maxLength={5}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-white"
                        placeholder="01/25" // UPDATED PLACEHOLDER
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">CVC</label>
                    <input
                        type="text"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        maxLength={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-white"
                        placeholder="123" // UPDATED PLACEHOLDER
                    />
                </div>
            </div>

            {/* Process Payment Button */}
            <button 
                onClick={handleProcessPayment}
                className="flex justify-center items-center w-full py-3 mb-2 bg-black dark:bg-indigo-600 text-white font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-700 transition disabled:bg-gray-400 dark:disabled:bg-gray-700 btn-primary"
                disabled={isProcessing}
            >
                {isProcessing ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                    </>
                ) : (
                    <>
                        Pay {amount > 0 ? formatValue(amount) : 'Now'}
                    </>
                )}
            </button>
            
            {/* Security Message */}
            <p className="text-center text-xs text-gray-500 dark:text-zinc-400 mb-6">
                Secure payment processing simulated
            </p>

            {/* --- Recurring Cycle Toggle --- */}
            <div className="flex justify-between items-center bg-gray-50 dark:bg-zinc-700 p-3 rounded-lg border border-gray-200 dark:border-zinc-600">
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                    Recurring Billing Cycle
                </span>
                <button
                    onClick={handleToggleCycle}
                    disabled={isProcessing}
                    className={`relative inline-flex items-center h-8 transition-colors duration-200 ease-in-out rounded-full w-24 focus:outline-none ${
                        billingCycle === 'annual' ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-zinc-600'
                    }`}
                >
                    <span
                        className={`inline-block w-12 h-6 transform bg-white rounded-full transition-transform duration-200 ease-in-out shadow-md text-xs font-semibold flex items-center justify-center ${
                            billingCycle === 'annual'
                                ? 'translate-x-[45px] text-indigo-600' // Moved right for annual
                                : 'translate-x-[5px] text-gray-600' // Moved left for monthly
                        }`}
                        style={{ width: '45px' }}
                    >
                        {billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                    </span>
                </button>
            </div>
        </div>
    );
}