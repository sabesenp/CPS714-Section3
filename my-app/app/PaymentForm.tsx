"use client";

import { useState } from 'react';
import { updateMembershipTier, SubscriptionType } from '../lib/dataService'; 

interface PaymentMethod {
    id: number;
    card_type: string;
    last_four: string;
    is_default: boolean;
}

// Interface for PaymentForm
interface PaymentFormProps {
    currentPlan: SubscriptionType; 
    paymentMethods: PaymentMethod[];
    userId: string;
    updateBalanceService: (userId: string, amount: number) => Promise<boolean>;
    onPaymentSuccess: () => void;
    currentRecurring: string; 
}

// Hoerce the string to a valid cycle for function calls
const getValidCycle = (cycle: string): 'monthly' | 'annual' => {
    const lower = cycle.toLowerCase();
    if (lower === 'annual') return 'annual';
    return 'monthly'; // Default to monthly if anything else is passed
};

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
    
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(getValidCycle(currentRecurring));


    const formatValue = (value: number) => {
        // Simple formatter for display 
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

    // Handler for the payment button, updates balance
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
            // update the user's balance in the database
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
    
    // Handler for the toggle switch 
    const handleToggleCycle = async () => {
        const newCycle = billingCycle === 'monthly' ? 'annual' : 'monthly';
        
        setIsProcessing(true);
        setStatusMessage(null);
        
        try {
             // Use currentPlan properties needed for the service call
             const result = await updateMembershipTier(
                userId, 
                currentPlan.plan_name ?? 'basic', 
                currentPlan.is_active ? 'active' : 'inactive', 
                currentPlan.balance ?? 0, 
                0, 
                'cycle', 
                newCycle
            );

            if (result.success) {
                setStatusMessage({ type: 'success', message: `Billing cycle successfully switched to ${newCycle.toUpperCase()}.` });
                setBillingCycle(newCycle); 
                onPaymentSuccess();
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
        // custom styling
        <div className="flex-1 min-w-[320px] p-6 bg-gray-900 rounded-xl shadow-md border border-gray-800 payment-panel">

            {/* Header */}
            <h2 className="text-xl font-semibold text-gray-100 mb-2">Make a Payment</h2>
            <p className="text-sm text-gray-400 mb-6">Securely process a one-time payment or add credit.</p>

            {/* Status Message */}
            {statusMessage && (
                <div className={`p-3 my-4 rounded-lg text-sm font-medium ${statusMessage.type === 'error' ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                    {isProcessing ? 'Processing request...' : statusMessage.message}
                </div>
            )}

            {/* Amount Input */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Amount (CAD)</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">C$</span>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-700 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-gray-800 text-gray-100 placeholder-gray-500"
                        placeholder="0.00"
                    />
                </div>
            </div>
            
            {/* Card Holder Name */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Cardholder Name</label>
                <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-gray-800 text-gray-100 placeholder-gray-500"
                    placeholder="Jane Doe"
                />
            </div>
            
            {/* Card Number */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Card Number</label>
                <input
                    type="text"
                    value={formatCardNumber(cardNumber)}
                    onChange={(e) => setCardNumber(e.target.value)}
                    maxLength={19}
                    className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-gray-800 text-gray-100 placeholder-gray-500"
                    placeholder="1111 2222 3333 4444"
                />
            </div>

            {/* Expiration and CVC */}
            <div className="flex space-x-4 mb-6">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Expiration (MM/YY)</label>
                    <input
                        type="text"
                        value={formatExpDate(expDate)}
                        onChange={(e) => setExpDate(e.target.value)}
                        maxLength={5}
                        className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-gray-800 text-gray-100 placeholder-gray-500"
                        placeholder="12/25"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-400 mb-1">CVC</label>
                    <input
                        type="text"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        maxLength={3}
                        className="w-full px-3 py-2 border border-gray-700 rounded-lg focus:ring-amber-500 focus:border-amber-500 bg-gray-800 text-gray-100 placeholder-gray-500"
                        placeholder="123"
                    />
                </div>
            </div>

            {/* Process Payment Button */}
            <button 
                onClick={handleProcessPayment}
                className="flex justify-center items-center w-full py-3 mb-2 bg-amber-500 text-gray-900 font-medium rounded-lg hover:bg-amber-400 transition disabled:bg-gray-700 disabled:text-gray-500 btn-primary"
                disabled={isProcessing}
            >
                {isProcessing ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-2"></div>
                        Processing...
                    </>
                ) : (
                    <>
                        Pay {amount > 0 ? formatValue(amount) : 'Now'}
                    </>
                )}
            </button>
            
            {/* Security Message */}
            <p className="text-center text-xs text-gray-500 mb-6">
                Secure payment processing simulated
            </p>

            {/* Toggle  */}
            <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700">
                <span className="text-sm font-medium text-gray-300">
                    Recurring Billing Cycle
                </span>
                <button
                    onClick={handleToggleCycle}
                    disabled={isProcessing}
                    className={`relative inline-flex items-center h-8 transition-colors duration-200 ease-in-out rounded-full w-24 focus:outline-none ${
                        billingCycle === 'annual' ? 'bg-amber-600' : 'bg-gray-700'
                    }`}
                >
                    <span
                        className={`inline-block w-12 h-6 transform bg-white rounded-full transition-transform duration-200 ease-in-out shadow-md text-xs font-semibold flex items-center justify-center ${
                            billingCycle === 'annual'
                                ? 'translate-x-[45px] text-amber-600' 
                                : 'translate-x-[5px] text-gray-700' 
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