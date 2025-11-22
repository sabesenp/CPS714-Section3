// This file is responsible for all communication with Supabase and data formatting.

import { supabase } from './supabase';

// --- Type Definition for Fetched Data (from DB) ---
interface FetchedData {
    tier: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    created_at: string | null;
    balance: number;
    // The joined data is a single object { Cost: number } or null if no match found
    subscriptions: { Cost: number } | null; 
}

// --- Type Definition for Subscription Data (for Component) ---
export type SubscriptionType = {
    plan_name: string | null;
    price: number | null;
    billing_cycle: string;
    is_active: boolean;
    member_since: string | null;
    next_renewal: string | null;
    balance: number;
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
            balance: balance ?? 0,
        };
    }

    return null;
}

export async function updateUserBalance(userId: string, amount: number): Promise<boolean> {
    
    // NOTE: For simplicity, we are assuming 'balance' is stored as a positive number (credit)
    // and we are simply SETTING the new balance. In a professional app, you would use 
    // PostgreSQL's increment operator for safer transactions.
    
    // First, retrieve the current membership ID, as 'user_id' is not the PK for 'memberships'
    const { data: membershipData, error: fetchError } = await supabase
        .from('memberships')
        .select('id, balance')
        .eq('user_id', userId)
        .maybeSingle();

    if (fetchError || !membershipData) {
        console.error("Failed to find user's membership row:", fetchError);
        return false;
    }
    
    // Calculate the new balance: Current balance (credit) + Payment amount
    // Note: If balance is stored as debt (negative), the logic changes. Assuming balance is credit.
    const currentBalance = membershipData.balance ?? 0;
    const newBalance = currentBalance + amount; 
    
    // Update the balance in the database
    const { error: updateError } = await supabase
        .from('memberships')
        .update({ balance: newBalance })
        .eq('id', membershipData.id); // Update by membership primary key (id)

    if (updateError) {
        console.error('Supabase balance update failed:', updateError);
        return false;
    }
    
    return true;
}

export async function updateMembershipTier(userId: string, newTier: string, newStatus: string): Promise<boolean> {
     // Retrieve the current membership ID
    const { data: membershipData, error: fetchError } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

    if (fetchError || !membershipData) {
        console.error("Failed to find user's membership row for update:", fetchError);
        return false;
    }

    // Update the tier and status in the database
    const { error: updateError } = await supabase
        .from('memberships')
        .update({ tier: newTier, status: newStatus })
        .eq('id', membershipData.id); 

    if (updateError) {
        console.error('Supabase tier update failed:', updateError);
        return false;
    }
    
    return true;
}