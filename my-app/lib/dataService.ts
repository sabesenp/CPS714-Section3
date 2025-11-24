
import { supabase } from './supabase'; 

//Interfaces for collecting Data
interface FetchedData {
    tier: string;
    status: 'active' | 'canceled' | 'past_due' | string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    created_at: string | null;
    subscriptions: { Cost: number } | null; 
    balance: number | null; 
    recurring: string | null; 
}

export type SubscriptionType = { 
    plan_name: string | null;
    price: number | null;
    billing_cycle: string;
    is_active: boolean;
    member_since: string | null;
    next_renewal: string | null;
    balance: number | null;
    recurring: 'monthly' | 'annual'; 
};

export type PaymentMethod = {
    id: number;
    card_type: string;
    last_four: string;
    is_default: boolean;
};

//helper functions

export const formatValue = (value: any): string => { 
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
        recurring, 
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
        
        const monthlyPrice = membershipData.subscriptions?.Cost ?? null; 
        const cycle = membershipData.recurring === 'annual' ? 'annual' : 'monthly';

        // Calculate annual price if cycle is annual
        const finalPrice = (cycle === 'annual' && monthlyPrice !== null)
            ? monthlyPrice * 12 // Annual price is 12x monthly cost
            : monthlyPrice;
        
        const { tier, status, created_at, current_period_start, current_period_end, balance, recurring } = membershipData;

        return {
            plan_name: tier,
            price: finalPrice, 
            billing_cycle: cycle, // Use the cycle name
            is_active: status === 'active',
            member_since: created_at || current_period_start,
            next_renewal: current_period_end,
            balance: balance,
            recurring: cycle, 
        };
    }

    return null;
}

export async function fetchPaymentMethods(userId: string): Promise<PaymentMethod[]> { 

    return [
        { id: 101, card_type: "Visa", last_four: "4242", is_default: true },
        { id: 102, card_type: "Mastercard", last_four: "1234", is_default: false },
    ];
}


export async function updateUserBalance(userId: string, amount: number): Promise<boolean> { 
    
    //Retrieve the current membership ID and balance
    const { data: membershipData, error: fetchError } = await supabase
        .from('memberships')
        .select('id, balance')
        .eq('user_id', userId)
        .maybeSingle();

    if (fetchError || !membershipData) {
        console.error("Failed to find user's membership row for update:", fetchError);
        return false;
    }
    
    //Calculate the new balance 
    const currentBalance = membershipData.balance ?? 0;
    const newBalance = currentBalance + amount; 
    
    //Update the balance in the database
    const { error: updateError } = await supabase
        .from('memberships')
        .update({ balance: newBalance })
        .eq('id', membershipData.id); // Update by membership primary key 

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
    action: 'upgrade' | 'reactivate' | 'downgrade' | 'cancel' | 'cycle',
    newRecurringCycle: 'monthly' | 'annual'
): Promise<{ success: boolean, message: string }> {
    
    if (action === 'upgrade' || action === 'reactivate') {
        if (currentBalance < price) {
            return { 
                success: false, 
                message: "Insufficient balance. Please make a payment first."
            };
        }
    }
    
    // Calculate new dates and fields
    let updatedFields: { [key: string]: any } = { 
        tier: newTier, 
        status: newStatus === 'canceled' ? 'canceled' : 'active', 
        recurring: newRecurringCycle 
    };

    if (newStatus === 'active') {
        const now = new Date();
        const nextPeriodEnd = new Date(now); 
        
        if (newRecurringCycle === 'monthly') {
            nextPeriodEnd.setMonth(now.getMonth() + 1);
        } else if (newRecurringCycle === 'annual') {
            nextPeriodEnd.setFullYear(now.getFullYear() + 1);
        }

        updatedFields.current_period_start = now.toISOString();
        updatedFields.current_period_end = nextPeriodEnd.toISOString();
        
    } else if (newStatus === 'canceled') {
        updatedFields.current_period_start = null;
        updatedFields.current_period_end = null;
    }
    
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

    if (action === 'upgrade' || action === 'reactivate') {
        newBalance = newBalance - price;
        updatedFields.balance = newBalance;
    }
    
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