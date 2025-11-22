import { createClient } from '@supabase/supabase-js';
import { scheduled } from '@netlify/functions';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler = scheduled(async () => {
    console.log('Running daily cleanup...');

    // 1. Find Pro Users (We must NOT delete their data)
    const { data: proUsers } = await supabase.from('profiles').select('id').eq('is_pro', true);
    const safeProIds = proUsers?.map(u => u.id) || ['00000000-0000-0000-0000-000000000000'];

    // 2. Delete Logs older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supabase.from('request_logs').delete().lt('created_at', oneHourAgo);

    // 3. Delete Free Endpoints older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase
        .from('endpoints')
        .delete()
        .lt('created_at', oneDayAgo)
        .not('user_id', 'in', `(${safeProIds.map(id => `'${id}'`).join(',')})`);
    
    console.log('Cleanup complete.');
    return { statusCode: 200 };
});