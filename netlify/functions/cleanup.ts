import { createClient } from '@supabase/supabase-js';
import { schedule } from '@netlify/functions';

// Initialize Supabase with Service Role Key
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// The core logic function
const cleanupTask = async () => {
    console.log("🧹 Running Cleanup Job...");
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    try {
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

// FIX: Netlify explicitly looks for an export named 'handler' wrapped in schedule
export const handler = schedule("0 3 * * *", cleanupTask);