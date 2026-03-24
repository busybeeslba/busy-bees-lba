/**
 * Mock data that matches what's in the shared database.
 * Used as a fallback if the shared database (localhost:3011) is not reachable.
 */
export const MOCK_AVAILABLE_SERVICES = [
    { serviceId: 'SRV-2481', name: 'AAC Device', provider: 'Busy Bees' },
    { serviceId: 'SRV-2311', name: 'Social Skills', provider: 'Busy Bees' },
    { serviceId: 'SRV-4243', name: 'PT', provider: 'Busy Bees' },
    { serviceId: 'SRV-7688', name: 'OT', provider: 'Busy Bees' },
    { serviceId: 'SRV-7292', name: 'Speech', provider: 'Busy Bees' },
    { serviceId: 'SRV-7099', name: 'Compensatory FCAT', provider: 'Busy Bees' },
    { serviceId: 'SRV-7019', name: 'Compensatory School ABA', provider: 'So here' },
    { serviceId: 'SRV-5830', name: 'Compensatory Home ABA', provider: 'Busy Bees' },
    { serviceId: 'SRV-1001', name: 'School Based ABA', provider: 'So here' },
    { serviceId: 'SRV-1002', name: 'Home Based ABA', provider: 'Busy Bees' },
    { serviceId: 'SRV-1003', name: 'BCBA Supervision', provider: 'Busy Bees' },
    { serviceId: 'SRV-1004', name: 'PCAT Training', provider: 'Busy Bees' },
];
