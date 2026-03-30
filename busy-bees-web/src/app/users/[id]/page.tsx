import UserProfileClient from './UserProfileClient';
import { createClient } from '@/utils/supabase/server';

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const supabase = await createClient();

    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', resolvedParams.id)
        .single();

    const fallbackUser = {
        id: resolvedParams.id,
        employeeId: 'Loading...',
        firstName: 'Loading...',
        lastName: '',
        phone: '',
        email: '',
        address: '',
        role: '',
        location: '',
        externalIp: '',
        browser: '',
        status: '',
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: 'Admin',
        updatedAt: new Date().toISOString().split('T')[0],
        updatedBy: 'Admin',
        avatar: 'U'
    };

    return <UserProfileClient initialUser={user || fallbackUser} />;
}
