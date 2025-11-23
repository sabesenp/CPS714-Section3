"use client";

import { useState } from 'react';

interface PaymentMethod {
    id: number;
    card_type: string;
    last_four: string;
    is_default: boolean;
}

interface PaymentFormProps {
    paymentMethods: PaymentMethod[];
    userId: string;
    updateBalanceService: (userId: string, amount: number) => Promise<boolean>;
    onPaymentSuccess: () => void;
}

export default function PaymentForm({ paymentMethods, userId, updateBalanceService, onPaymentSuccess }: PaymentFormProps) {
    // --- Form State ---
    const [cardholderName, setCardholderName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expDate, setExpDate] = useState('');
    const [cvc, setCvc] = useState('');
    const [amount, setAmount] = useState(0.00);
    
    // --- UI State ---
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', message: string } | null>(null);

    const formatValue = (value: number) => {
        // Simple formatter for local display, matching the currency defined in payments.tsx (CAD)
        return `C$${value.toFixed(2)}`;
    };

    // --- Validation and Formatting Helpers ---

    const validateForm = () => {
        if (amount <= 0) return "Please enter an amount greater than zero.";
        if (cardholderName.trim() === '') return "Cardholder name is required.";
        if (cardNumber.replace(/\s/g, '').length !== 16) return "Card number must be 16 digits.";
        if (cvc.length !== 3) return "CVC must be 3 digits.";
        if (expDate.length !== 5 || !expDate.includes('/')) return "Expiration date must be MM/YY (e.g., 12/25).";
        return null;
    };

    const formatCardNumber = (value: string) => {
        // Remove non-digits
        const cleaned = value.replace(/\D/g, '');
        // Apply grouping pattern (4 digits, space, 4 digits...)
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

    const handleProcessPayment = async () => {
        const validationError = validateForm();
        if (validationError) {
            setStatusMessage({ type: 'error', message: validationError });
            return;
        }

        setIsProcessing(true);
        setStatusMessage(null);

        // --- Payment Simulation & Balance Update ---
        
        // 1. Simulate API latency
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
            // 2. Call the service to update the user's balance in the database (Add the payment amount)
            const success = await updateBalanceService(userId, amount);

            if (success) {
                setStatusMessage({ type: 'success', message: `Payment of ${formatValue(amount)} successful! Credit balance updated.` });
                // Reload parent component data to show new balance instantly
                onPaymentSuccess();
                
                // Optional: Clear form fields on success
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
                    placeholder="Jane Doe"
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
                    placeholder="XXXX XXXX XXXX XXXX"
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
                        placeholder="MM/YY"
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
                        placeholder="123"
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
            <p className="text-center text-xs text-gray-500 dark:text-zinc-400">
                Secure payment processing simulated
            </p>
        </div>
    );
}