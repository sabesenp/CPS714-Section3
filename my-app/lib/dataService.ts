import { supabase } from './supabase'; 

// --- Type Definition for Fetched Data (from DB) ---
interface FetchedData {
    tier: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    created_at: string | null;
    subscriptions: { Cost: number } | null; 
    balance: number | null; 
}

// --- Type Definition for Subscription Data (for Component) ---
export type SubscriptionType = {
    plan_name: string | null;
    price: number | null;
    billing_cycle: string;
    is_active: boolean;
    member_since: string | null;
    next_renewal: string | null;
    balance: number | null;
};

// --- Type Definition for Payment Methods (for Component) ---
export type PaymentMethod = {
    id: number;
    card_type: string;
    last_four: string;
    is_default: boolean;
};


// --- Helper Functions (Exported for component use) ---

export const formatValue = (value: any): string => {
    // Uses C$ symbol for Canadian Dollars (CAD)
    if (value === null || value === undefined) return 'N/A'; 
    return typeof value === 'number' ? `C$${value.toFixed(2)}` : value || 'N/A';
};
  
export const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    if (typeof dateString !== 'string' && typeof dateString !== 'number') return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
};


// --- Supabase Fetching Functions (Exported) ---

export async function fetchTestValue(userId: string) {
    if (!userId) return 'User ID Missing';
    
    const { data, error } = await supabase
        .from('memberships') 
        .select('tier') 
        .eq('user_id', userId) 
        .maybeSingle(); 

    if (error && error.code !== 'PGRST116') { 
        console.error('Supabase Test Fetch Error:', error);
        return 'FETCH FAILED';
    }
    
    return data ? `Tier Found: ${data.tier || 'No Tier Value'}` : 'TEST: No Membership Found';
}


export async function fetchSubscriptionData(userId: string): Promise<SubscriptionType | null> {
    if (!userId) return null;
    
    const { data, error } = await supabase
      .from('memberships') 
      .select(`
        tier, 
        status, 
        current_period_start, 
        current_period_end, 
        created_at,
        balance,             
        subscriptions ( Cost ) 
      `)
      .eq('user_id', userId)
      .maybeSingle(); 

    if (error) {
      console.error('Supabase subscription fetch error:', error);
      throw error;
    }
    
    const membershipData = data as FetchedData | null;

    if (membershipData) {
        
        const price = membershipData.subscriptions?.Cost ?? null; 
        
        const { tier, status, created_at, current_period_start, current_period_end, balance } = membershipData;

        return {
            plan_name: tier,
            price: price, 
            billing_cycle: 'monthly', 
            is_active: status === 'active',
            member_since: created_at || current_period_start,
            next_renewal: current_period_end,
            balance: balance,
        };
    }

    return null;
}

export async function fetchPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    // --- MOCK IMPLEMENTATION ---
    // In a real app, this would fetch saved card details from a 'payment_methods' table.
    return [
        { id: 101, card_type: "Visa", last_four: "4242", is_default: true },
        { id: 102, card_type: "Mastercard", last_four: "1234", is_default: false },
    ];
}


export async function updateUserBalance(userId: string, amount: number): Promise<boolean> {
    
    // 1. Retrieve the current membership ID and balance
    const { data: membershipData, error: fetchError } = await supabase
        .from('memberships')
        .select('id, balance')
        .eq('user_id', userId)
        .maybeSingle();

    if (fetchError || !membershipData) {
        console.error("Failed to find user's membership row for update:", fetchError);
        return false;
    }
    
    // 2. Calculate the new balance (Current credit + Payment amount)
    const currentBalance = membershipData.balance ?? 0;
    const newBalance = currentBalance + amount; 
    
    // 3. Update the balance in the database
    const { error: updateError } = await supabase
        .from('memberships')
        .update({ balance: newBalance })
        .eq('id', membershipData.id);

    if (updateError) {
        console.error('Supabase balance update failed:', updateError);
        return false;
    }
    
    return true;
}

export async function updateMembershipTier(
    userId: string, 
    newTier: string, 
    newStatus: string, 
    currentBalance: number, 
    price: number,
    action: 'upgrade' | 'reactivate' | 'downgrade' | 'cancel',
    newRecurringCycle: 'monthly' | 'annual'
): Promise<{ success: boolean, message: string }> {
    
    // --- BALANCE SUFFICIENCY CHECK (Only for actions that cost money) ---
    if (action === 'upgrade' || action === 'reactivate') {
        if (currentBalance < price) {
            return { 
                success: false, 
                message: "Insufficient balance. Please make a payment first." // Simplified message
            };
        }
    }
    
    // 1. Calculate new dates
    let updatedFields: { [key: string]: any } = { 
        tier: newTier, 
        status: newStatus,
        recurring: newRecurringCycle // Update the billing cycle
    };

    if (newStatus === 'active') {
        const now = new Date();
        const nextMonth = new Date();
        
        // Reset renewal date to 1 month from now
        nextMonth.setMonth(now.getMonth() + 1);

        updatedFields.current_period_start = now.toISOString();
        updatedFields.current_period_end = nextMonth.toISOString();
        
    } else if (newStatus === 'canceled') {
        // When canceled, clear renewal dates as requested
        updatedFields.current_period_start = null;
        updatedFields.current_period_end = null;
    }

    // 2. Retrieve membership ID and update DB
    const { data: membershipData, error: fetchError } = await supabase
        .from('memberships')
        .select('id, balance')
        .eq('user_id', userId)
        .maybeSingle();

    if (fetchError || !membershipData) {
        console.error("Failed to find user's membership row for tier update:", fetchError);
        return { success: false, message: "Membership record not found." };
    }
    
    let newBalance = membershipData.balance ?? 0;

    // 3. DEDUCT PRICE (Only for upgrade/reactivate actions)
    if (action === 'upgrade' || action === 'reactivate') {
        newBalance = newBalance - price;
        updatedFields.balance = newBalance;
    }
    
    // 4. Perform the final database update
    const { error: updateError } = await supabase
        .from('memberships')
        .update(updatedFields)
        .eq('id', membershipData.id);

    if (updateError) {
        console.error('Supabase membership update failed:', updateError);
        return { success: false, message: `Update failed: ${updateError.message}` };
    }
    
    return { success: true, message: `Plan successfully updated to ${newTier.toUpperCase()}.` };
}