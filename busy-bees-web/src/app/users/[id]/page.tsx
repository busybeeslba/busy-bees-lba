import UserProfileClient from './UserProfileClient';

// Mock DB wrapper for dynamic route data
// In a real app, this is fetched via API or ORM based on params.id
const fetchUser = async (id: string) => {
    // Shared mock structure with the Users list page
    const MOCK_USERS = [
        {
            id: 1,
            employeeId: 'EPM-1001',
            firstName: 'Sarah',
            lastName: 'Connor',
            phone: '555-0101',
            email: 'sarah@busybees.com',
            address: '123 SkyNet Blvd, LA',
            role: 'Senior Technician',
            location: 'Acme Corp',
            externalIp: '192.168.1.5',
            browser: 'Chrome 120',
            status: 'Active',
            createdAt: '2025-01-10 08:00',
            createdBy: 'Admin',
            updatedAt: '2025-10-24 09:15',
            updatedBy: 'Self',
            avatar: 'SC'
        },
        {
            id: 2,
            employeeId: 'EPM-1002',
            firstName: 'Kyle',
            lastName: 'Reese',
            phone: '555-0102',
            email: 'kyle@busybees.com',
            address: '45 Future Ln, LA',
            role: 'Field Specialist',
            location: 'Last seen: HQ',
            externalIp: '172.16.0.2',
            browser: 'Safari 17',
            status: 'Offline',
            createdAt: '2025-02-15 10:30',
            createdBy: 'Sarah Connor',
            updatedAt: '2025-10-24 08:00',
            updatedBy: 'System',
            avatar: 'KR'
        },
    ];
    const found = MOCK_USERS.find(e => e.id.toString() === id);
    if (found) return found;

    // Return a skeleton for custom dynamically added users (handled client-side)
    return {
        id: id,
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
};

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
    // Next.js 15+ async params
    const resolvedParams = await params;
    const user = await fetchUser(resolvedParams.id);

    return <UserProfileClient initialUser={user} />;
}
