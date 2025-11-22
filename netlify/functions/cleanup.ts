import { createClient } from '@supabase/supabase-js';
import { schedule } from '@netlify/functions';

// Initialize Supabase with the Service Role Key (Admin access)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This function runs every day at 3 AM to delete old mocks (older than 24 hours)
const handler = async (event: any) => {
    console.log("🧹 Running Cleanup Job...");

    // Calculate the timestamp for 24 hours ago
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    try {
        // Delete rows where created_at is older than 24 hours
        const { error, count } = await supabase
            .from('endpoints')
            .delete({ count: 'exact' })
            .lt('created_at', yesterday.toISOString());

        if (error) {
            console.error("❌ Cleanup failed:", error);
            return { statusCode: 500 };
        }

        console.log(`✅ Cleanup complete. Deleted ${count} old endpoints.`);
        return { statusCode: 200 };
    } catch (err) {
        console.error("❌ Unexpected error during cleanup:", err);
        return { statusCode: 500 };
    }
};

// Schedule the function to run daily via cron syntax
export const cleanup = schedule("0 3 * * *", handler);