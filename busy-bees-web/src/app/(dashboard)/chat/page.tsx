import { Suspense } from 'react';
import { ChatDashboard } from '@/components/chat/ChatDashboard';

export default function ChatPage() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <Suspense fallback={<div>Loading Chat...</div>}>
         <ChatDashboard />
      </Suspense>
    </div>
  );
}
