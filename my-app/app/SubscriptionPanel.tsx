"use client";

// Props interface for clarity
interface SubscriptionPanelProps {
    currentPlan: any; // Using 'any' to match the state in payments.tsx
    formatValue: (value: any) => string;
    formatDate: (dateString: string) => string;
}

export default function SubscriptionPanel({ currentPlan, formatValue, formatDate }: SubscriptionPanelProps) {
  // Check if currentPlan data has been loaded and is valid
  const isDataLoaded = currentPlan && currentPlan.plan_name;

  return (
    <div className="flex-1 min-w-[320px] p-6 bg-white dark:bg-zinc-800 rounded-xl shadow-md border border-gray-100 dark:border-zinc-700 subscription-panel">
      
      {/* Header and Status Badge */}
      <div className="flex justify-between items-start mb-4">
        <div className='flex flex-col'>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Current Subscription</h2>
          <p className="text-sm text-gray-600 dark:text-zinc-400">Manage your membership plan and billing</p>
        </div>
        {isDataLoaded && currentPlan.is_active ? (
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
            {isDataLoaded ? currentPlan.plan_name.toUpperCase() : 'Loading Plan...'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Billed {isDataLoaded ? currentPlan.billing_cycle : 'N/A'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {isDataLoaded ? `${formatValue(currentPlan.price)}/month` : 'N/A'}
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

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <button className="flex-1 flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-800 dark:text-zinc-200 font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition btn-primary">
          Upgrade Plan
        </button>
        <button className="flex-1 flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-800 dark:text-zinc-200 font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition">
          Cancel Subscription
        </button>
      </div>

    </div>
  );
}