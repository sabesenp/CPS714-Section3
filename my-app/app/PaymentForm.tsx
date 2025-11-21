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
    userId: string; // Added user ID prop
    updateBalanceService: (userId: string, amount: number) => Promise<boolean>; // Added service prop
    onPaymentSuccess: () => void; // Added reload prop
}

export default function PaymentForm({ 
    paymentMethods, // Ignored
    userId, 
    updateBalanceService, 
    onPaymentSuccess 
}: PaymentFormProps) {
    
    // Form State
    const [amount, setAmount] = useState<number>(0.00);
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    
    const [isProcessing, setIsProcessing] = useState(false);

    const handleQuickPay = (quickAmount: number) => {
        setAmount(quickAmount);
    };

    const formatValue = (value: number) => {
        return `C$${value.toFixed(2)}`;
    }

    const handleProcessPayment = async () => {
        // Simple form validation for simulation
        if (amount <= 0) {
            alert("Please enter an amount greater than zero.");
            return;
        }
        if (cardName.length < 3 || cardNumber.length < 15 || expiry.length !== 5 || cvc.length < 3) {
             alert("Please enter valid card details (Name, Number, Expiry, CVC).");
            return;
        }
        
        // Disable button and show loading state
        setIsProcessing(true);
        
        try {
            // 1. SIMULATE SECURE PAYMENT PROCESSING 
            console.log(`Simulating payment initiation for ${formatValue(amount)} using card ending in ${cardNumber.slice(-4)}...`);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network latency
            
            // 2. UPDATE BALANCE IN SUPABASE 
            const success = await updateBalanceService(userId, amount);

            if (success) {
                alert(`Payment successful! ${formatValue(amount)} credited to your account.`);
                setAmount(0.00); // Clear amount
                setCardName(''); // Clear form
                setCardNumber('');
                setExpiry('');
                setCvc('');

                onPaymentSuccess(); // Trigger parent component to reload dashboard data
            } else {
                alert("Payment failed: Could not update user balance in the database.");
            }
        } catch (error) {
            console.error("Payment transaction error:", error);
            alert("An unexpected error occurred during payment processing.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex-1 min-w-[320px] p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-gray-100 dark:border-zinc-700">
            
            {/* Header */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Make a Payment</h2>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">Process one-time payments or add credits to your account.</p>

            {/* CARD DETAILS INPUTS */}

            {/* Card Holder Name */}
            <div className="mb-4">
                <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Card Holder Name</label>
                <input
                    id="cardName"
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-white"
                    placeholder="John Doe"
                    disabled={isProcessing}
                />
            </div>

            {/* Card Number */}
            <div className="mb-4">
                <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Card Number</label>
                <input
                    id="cardNumber"
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim())} // Formats number with spaces
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-white"
                    placeholder="XXXX XXXX XXXX XXXX"
                    maxLength={19} // 16 digits + 3 spaces
                    disabled={isProcessing}
                />
            </div>

            {/* Expiry and CVC */}
            <div className="mb-6 flex space-x-4">
                <div className="flex-1">
                    <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Expiration (MM/YY)</label>
                    <input
                        id="expiry"
                        type="text"
                        value={expiry}
                        onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '');
                            if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2, 4);
                            setExpiry(value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-white"
                        placeholder="MM/YY"
                        maxLength={5}
                        disabled={isProcessing}
                    />
                </div>
                <div className="flex-1">
                    <label htmlFor="cvc" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">CVC</label>
                    <input
                        id="cvc"
                        type="text"
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} // Max 4 digits
                        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-white"
                        placeholder="123"
                        maxLength={4}
                        disabled={isProcessing}
                    />
                </div>
            </div>
            
            {/* Amount Input */}
            <div className="mb-6">
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Amount (CAD)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-zinc-400">
                  C$
                </span>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-zinc-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Process Payment Button */}
            <button 
                onClick={handleProcessPayment}
                className="flex justify-center items-center w-full py-3 mb-2 bg-black dark:bg-indigo-600 text-white font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-indigo-700 transition disabled:bg-gray-400 dark:disabled:bg-gray-700"
                disabled={isProcessing}
            >
                {isProcessing ? (
                    'Processing...'
                ) : (
                    <>
                        Pay {formatValue(amount)}
                    </>
                )}
            </button>
            
            {/* Security Message */}
            <p className="text-center text-xs text-gray-500 dark:text-zinc-400 mb-6">
              **SECURITY NOTE:** Do not enter real card details. This form is for simulation only.
            </p>

        </div>
    );
}