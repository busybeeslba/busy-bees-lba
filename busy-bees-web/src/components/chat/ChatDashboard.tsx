"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MoreVertical, Send, Paperclip, Smile, Phone, Video, Check, CheckCheck, X, Download, Plus, Users, User, ArrowLeft } from 'lucide-react';
import styles from './ChatDashboard.module.css';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface DBUser {
  id: string; // uuid
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  attachmentUrl?: string; // Phase 3 attachments
}

interface ConversationUI {
  id: string;
  name: string;
  avatar: string;
  type: 'direct' | 'group';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const COMMON_EMOJIS = ['😂', '❤️', '👍', '🙏', '😊', '😭', '🔥', '🥰', '👏', '🎉', '🐝', '✨'];

export const ChatDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<DBUser | null>(null);
  const [allUsers, setAllUsers] = useState<DBUser[]>([]);
  const [conversations, setConversations] = useState<ConversationUI[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>("Awaiting fetch...");
  
  const searchParams = useSearchParams();
  const urlRoomId = searchParams.get('roomId');
  
  const [messageText, setMessageText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{url: string, name: string, file: File} | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Menus
  const [showNewChatMenu, setShowNewChatMenu] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const chatOptionsRef = useRef<HTMLDivElement>(null);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Computed properties
  const activeUserUI = conversations.find(c => c.id === activeChat);
  const activeFeed = messages.filter(msg => msg.conversationId === activeChat);

  // Auto-scroll to bottom
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeFeed.length, activeChat]);

  // Handle outside clicks for chat options dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatOptionsRef.current && !chatOptionsRef.current.contains(e.target as Node)) {
        setShowChatOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // INITIALIZATION: Fetch Auth Session & Global Users
  useEffect(() => {
    let isMounted = true;
    const initData = async (retries = 3) => {
       try {
           const { data: authData } = await supabase.auth.getUser();
           const email = authData?.user?.email;
           
           const { data: dbUsers, error: usersErr } = await supabase.from('users').select('*');
           if (usersErr) throw usersErr;
           
           if (dbUsers && isMounted) {
              setAllUsers(dbUsers);
              let me: DBUser | null = null;
              if (email) {
                 me = dbUsers.find(u => String(u.email).toLowerCase() === String(email).toLowerCase()) || null;
              } else {
                 me = dbUsers[0];
              }
              if (me) setCurrentUser(me);
           }
       } catch (err) {
           console.error("Failed to load initial Chat Dashboard data! Engine soft-lock prevented. Retrying...", err);
           if (retries > 0 && isMounted) {
               setTimeout(() => initData(retries - 1), 1000);
           }
       }
    };
    initData();
    return () => { isMounted = false; };
  }, []);

  // LOAD CONVERSATIONS ONCE CURRENT USER IS KNOWN
  const fetchConversations = async (userId: string, systemUsers: DBUser[]) => {
     const cacheBuster = crypto.randomUUID();
     
     // 1. Primary Check: Direct Associations
     let { data: myParticipations } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', userId).neq('conversation_id', cacheBuster);
     
     // 2. Ultimate Fallback: If RLS completely obliterates the participant table read, mathematically derive participations natively from messages we can visibly see
     if (!myParticipations || myParticipations.length === 0) {
        const { data: visibleMessages } = await supabase.from('chat_messages').select('conversation_id').neq('id', cacheBuster);
        if (visibleMessages && visibleMessages.length > 0) {
           const uniqueRoomIds = Array.from(new Set(visibleMessages.map(m => m.conversation_id)));
           myParticipations = uniqueRoomIds.map(id => ({ conversation_id: id }));
        }
     }
     
     if (myParticipations && myParticipations.length > 0) {
        const roomIds = myParticipations.map(p => p.conversation_id);
        
        // Fetch Rooms
        const { data: rooms } = await supabase.from('chat_rooms').select('*').in('id', roomIds).neq('id', cacheBuster);
        
        // Fetch all participants of those rooms to map avatars for direct chats
        const { data: allParticipants } = await supabase.from('chat_participants').select('*').in('conversation_id', roomIds).neq('user_id', cacheBuster);
        
        // Fetch full message fallbacks in bulk to prevent errors if RLS blocks participants
        const { data: messagesFallback } = await supabase.from('chat_messages').select('sender_id, conversation_id').in('conversation_id', roomIds).neq('sender_id', userId).neq('id', cacheBuster);
        
        if (rooms && allParticipants) {
           const uis: ConversationUI[] = [];
           
           rooms.forEach(room => {
              if (room.type === 'group') {
                 uis.push({
                    id: room.id,
                    type: 'group',
                    name: room.name || 'Group Chat',
                    avatar: room.avatar_url || 'https://ui-avatars.com/api/?name=G&background=4f46e5&color=fff',
                    lastMessage: 'Tap to view messages', lastMessageTime: '', unreadCount: 0
                 });
              } else {
                 // Direct Chat resolving
                 const others = allParticipants.filter(p => p.conversation_id === room.id && p.user_id !== userId);
                 let otherUserId = others[0]?.user_id;

                 // Robust Fallback: If RLS blocked the other participant's row but we received a message from them, infer their ID instantly!
                 if (!otherUserId && messagesFallback) {
                     const fallbackSender = messagesFallback.find(m => m.conversation_id === room.id);
                     if (fallbackSender) {
                         otherUserId = fallbackSender.sender_id;
                     }
                 }

                 const otherUserObj = systemUsers.find(su => su.id === otherUserId);
                 
                 if (otherUserObj) {
                    const fullName = `${otherUserObj.firstName} ${otherUserObj.lastName}`.trim();
                    uis.push({
                       id: room.id,
                       type: 'direct',
                       name: fullName || otherUserObj.email,
                       avatar: otherUserObj.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=00E3BF&color=000`,
                       lastMessage: 'Tap to view messages', lastMessageTime: '', unreadCount: 0
                    });
                 }
              }
           });
           
           setConversations(uis);
           setDebugInfo(`User: ${userId} | SysUsers: ${systemUsers.length} | PRT: ${myParticipations.length} | Rooms: ${rooms?.length} | AllParts: ${allParticipants?.length} | UIs: ${uis.length}`);
           
           setActiveChat(prev => {
              if (prev) return prev;
              if (urlRoomId && uis.find(u => u.id === urlRoomId)) return urlRoomId;
              if (uis.length > 0) return uis[0].id;
              return null;
           });
        }
     } else {
        setConversations([]);
        setDebugInfo(`User: ${userId} | SysUsers: ${systemUsers.length} | PRT: 0`);
     }
  };

  // INITIAL MOUNT
  useEffect(() => {
     if (currentUser && allUsers.length > 0) {
        fetchConversations(currentUser.id, allUsers);
     }
  }, [currentUser, allUsers]);

  // HANDLE NOTIFICATION DROPDOWN ROOM OVERRIDING
  useEffect(() => {
     if (urlRoomId && urlRoomId !== activeChat) {
         setActiveChat(urlRoomId);
     }
  }, [urlRoomId]);

  // SYNC ACTIVE CHAT TO SESSION STORAGE FOR GLOBAL HEADER VISIBILITY
  useEffect(() => {
     if (activeChat) {
         sessionStorage.setItem('activeChatId', activeChat);
     } else {
         sessionStorage.removeItem('activeChatId');
     }
  }, [activeChat]);

  // AUTO-READ RECEIPT UPDATER
  useEffect(() => {
     if (!currentUser || !activeChat) return;
     const unreadIds = activeFeed.filter(m => m.senderId !== currentUser.id && m.status !== 'read').map(m => m.id);
     
     if (unreadIds.length > 0) {
        // Optimistic UI Update
        setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, status: 'read' } : m));
        // Database Sync
        supabase.from('chat_messages').update({ status: 'read' }).in('id', unreadIds).then();
     }
  }, [activeFeed.length, activeChat, currentUser]);

  // PHASE 3.5 LIVE MESSAGE FETCHING & REALTIME SUBSCRIPTION
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchMessages = async () => {
      const cacheBuster = crypto.randomUUID();
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .neq('id', cacheBuster)
        .order('created_at', { ascending: true });
        
      if (data && !error && data.length > 0) {
         const mapped = data.map(dbMsg => ({
            id: dbMsg.id,
            conversationId: dbMsg.conversation_id,
            senderId: dbMsg.sender_id,
            content: dbMsg.content,
            timestamp: new Date(dbMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: dbMsg.status || 'sent',
            attachmentUrl: dbMsg.attachment_url
         }));
         setMessages(mapped);
      }
    };

    fetchMessages();

    // WE MOVED THE CHAT_MESSAGES INSERT LISTENER LOGIC A FEW LINES DOWN
    const handleInsertPayload = async (dbMsg: any) => {
          // Mitigate Postgres Read-Replica sync race conditions by deferring the restorative REST queries by 1.5s
          setTimeout(async () => {
             const { data: ensureHealed } = await supabase.from('chat_participants').select('conversation_id').eq('conversation_id', dbMsg.conversation_id).eq('user_id', currentUser.id);
             if (!ensureHealed || ensureHealed.length === 0) {
                 await supabase.from('chat_participants').insert({ conversation_id: dbMsg.conversation_id, user_id: currentUser.id });
             }
             fetchConversations(currentUser.id, allUsers);
          }, 1500);
          
          const mapped: Message = {
            id: dbMsg.id,
            conversationId: dbMsg.conversation_id,
            senderId: dbMsg.sender_id,
            content: dbMsg.content,
            timestamp: new Date(dbMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: dbMsg.status || 'sent',
            attachmentUrl: dbMsg.attachment_url
          };
          
          setMessages(prev => {
             if (prev.find(m => m.id === mapped.id)) return prev;
             return [...prev, mapped];
          });
          
          // NATIVE CLIENT-SIDE UI RECONSTRUCTION: Bypass REST API completely for raw reactivity
          setConversations(prev => {
             const exists = prev.find(c => c.id === dbMsg.conversation_id);
             if (exists) return prev; // Valid, let normal flow or useEffect updates handle latest text
             
             const sender = allUsers.find(u => u.id === dbMsg.sender_id);
             if (sender) {
                 const syntheticUI: ConversationUI = {
                   id: dbMsg.conversation_id,
                   name: `${sender.firstName} ${sender.lastName}`.trim(),
                   avatar: sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sender.firstName)}`,
                   isOnline: true,
                   lastMessage: dbMsg.content,
                   lastMessageTime: mapped.timestamp,
                   unreadCount: 1,
                   type: 'direct'
                 };
                 return [syntheticUI, ...prev];
             }
             return prev;
          });
          
          // Hijack the Welcome screen if it's currently blocking the view
          setActiveChat(prev => {
             if (!prev) return dbMsg.conversation_id;
             return prev;
          });
    };
    
    // Listen for the global bounce event to bypass multiplexer death and ensure pure sync with Header.tsx
    const handleGlobalChatMsg = (e: any) => handleInsertPayload(e.detail);
    const handleGlobalChatUpdate = (e: any) => {
        const dbMsg = e.detail;
        setMessages(prev => prev.map(m => m.id === dbMsg.id ? { ...m, status: dbMsg.status || 'sent' } : m));
    };
    
    if (typeof window !== 'undefined') {
       window.addEventListener('new_chat_message', handleGlobalChatMsg);
       window.addEventListener('update_chat_message', handleGlobalChatUpdate);
    }

    const channelId = `table-db-changes-${currentUser.id}-${Date.now()}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => handleInsertPayload(payload.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, (payload) => {
          const dbMsg = payload.new as any;
          setMessages(prev => prev.map(m => m.id === dbMsg.id ? { ...m, status: dbMsg.status || 'sent' } : m));
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_rooms' }, (payload) => {
          const deletedRoom = payload.old as any;
          if (!deletedRoom.id) return;
          
          setConversations(prev => prev.filter(c => c.id !== deletedRoom.id));
          setActiveChat(current => {
             if (current === deletedRoom.id) return null;
             return current;
          });
      })
      .subscribe();

    const partsChannel = supabase.channel('chat-participants-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${currentUser.id}` }, async () => {
         await fetchConversations(currentUser.id, allUsers);
         // If active chat is deleted out from under us by another user setting 'Delete for Everyone'
         if (activeChat) {
            const { data } = await supabase.from('chat_participants').select('conversation_id').eq('conversation_id', activeChat).eq('user_id', currentUser.id);
            if (!data || data.length === 0) {
               setActiveChat(null);
            }
         }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(partsChannel);
      if (typeof window !== 'undefined') {
         window.removeEventListener('new_chat_message', handleGlobalChatMsg);
         window.removeEventListener('update_chat_message', handleGlobalChatUpdate);
      }
    };
  }, [currentUser, allUsers]);

  // Robust Self-Healing Poller for Read Receipts
  useEffect(() => {
     if (!activeChat || !currentUser) return;
     const pollId = setInterval(async () => {
         // Only poll for messages that we sent which are still marked as 'sent' local-side, to see if they got read remotely
         const pendingIds = messages.filter(m => m.senderId === currentUser.id && m.status === 'sent').map(m => m.id);
         if (pendingIds.length === 0) return;
         
         const { data } = await supabase.from('chat_messages').select('id, status').in('id', pendingIds).eq('status', 'read');
         if (data && data.length > 0) {
             setMessages(prev => prev.map(m => {
                 const match = data.find(d => d.id === m.id);
                 if (match) return { ...m, status: 'read' };
                 return m;
             }));
         }
     }, 3000);
     return () => clearInterval(pollId);
  }, [activeChat, currentUser, messages]);

  // ACTION: Send Message
  const handleSendMessage = async () => {
    if (!activeChat || (!messageText.trim() && !pendingAttachment)) return;
    if (!currentUser || isUploading) return;

    setIsUploading(true);
    let uploadedUrl = undefined;

    // 1. Storage Phase
    if (pendingAttachment && pendingAttachment.file) {
       const fileExt = pendingAttachment.file.name.split('.').pop();
       const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
       
       const { data, error } = await supabase.storage.from('chat_attachments').upload(fileName, pendingAttachment.file);
       if (error) {
         console.error("Storage Error:", error);
         alert("Failed to upload image.");
         setIsUploading(false);
         return;
       } else if (data) {
         const { data: publicData } = supabase.storage.from('chat_attachments').getPublicUrl(data.path);
         uploadedUrl = publicData.publicUrl;
       }
    }

    // 2. DB Insert Phase 
    const newMsgId = crypto.randomUUID();
    const insertPayload = {
      id: newMsgId,
      conversation_id: activeChat,
      sender_id: currentUser.id,
      content: messageText.trim(),
      attachment_url: uploadedUrl,
      status: 'sent'
    };

    // Optimistic UI Update directly into active feed instantly
    const optimisticMsg: Message = {
      id: newMsgId,
      conversationId: activeChat,
      senderId: currentUser.id,
      content: messageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sending',
      attachmentUrl: uploadedUrl
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    setMessageText('');
    setPendingAttachment(null);
    setShowEmojiPicker(false);
    setIsUploading(false);

    // Fire actual network request in background
    const { error: insertError } = await supabase.from('chat_messages').insert(insertPayload);
    if (insertError) {
      console.error("Database Insert Error:", insertError);
      // Revert Optimistic UI if catastrophic network failure
      setMessages(prev => prev.filter(m => m.id !== newMsgId));
      alert("Failed to send message: Network error.");
    } else {
      // Mark as sent visually
      setMessages(prev => prev.map(m => m.id === newMsgId ? { ...m, status: 'sent' } : m));

      // Dispatch Push Notification cleanly through our own Next.js API route (no CORS failures, zero database crashes)
      try {
          const { data: participants } = await supabase.from('chat_participants').select('user_id').eq('conversation_id', activeChat).neq('user_id', currentUser.id);
          const targetUserIds = participants?.map(p => p.user_id) || [];

          if (targetUserIds.length > 0) {
              fetch('/api/push', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      targetUserIds,
                      senderName: activeUserUI?.type === 'group' ? `${activeUserUI.name}` : currentUser.firstName,
                      messageText: activeUserUI?.type === 'group' ? `${currentUser.firstName}: ${messageText.trim() || 'Sent an attachment'}` : (messageText.trim() || 'Sent an attachment'),
                      roomId: activeChat
                  })
              }).catch(() => {});
          }
      } catch (pushErr) {}
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPendingAttachment({ url, name: file.name, file });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ACTION: Start New Private Chat
  const startPrivateChat = async (targetUserId: string) => {
      if (!currentUser) return;
      setShowNewChatMenu(false);

      try {
          // Check for existing room
          const { data: myRooms, error: myRoomsErr } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', currentUser.id);
          if (myRoomsErr) console.error("Error fetching myRooms:", myRoomsErr);
          
          const myRoomIds = myRooms?.map(r => r.conversation_id) || [];
          
          let existingRoomId = null;
          
          if (myRoomIds.length > 0) {
              const { data: theirRooms, error: theirRoomsErr } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', targetUserId).in('conversation_id', myRoomIds);
              if (theirRoomsErr) console.error("Error fetching theirRooms:", theirRoomsErr);
              
              if (theirRooms && theirRooms.length > 0) {
                 const intersectionIds = theirRooms.map(r => r.conversation_id);
                 const { data: directRooms, error: directRoomsErr } = await supabase.from('chat_rooms').select('id').in('id', intersectionIds).eq('type', 'direct');
                 if (directRoomsErr) console.error("Error fetching directRooms:", directRoomsErr);
                 
                 if (directRooms && directRooms.length > 0) {
                    existingRoomId = directRooms[0].id;
                 }
              }
          }

          if (existingRoomId) {
             setActiveChat(existingRoomId);
             return;
          }

          // Create new private room
          const { data: newRoom, error: createRoomErr } = await supabase.from('chat_rooms').insert({ type: 'direct' }).select().single();
          if (createRoomErr) {
              console.error("Error creating new chat_rooms:", createRoomErr);
              return;
          }
          
          if (newRoom) {
             const { error: partsErr } = await supabase.from('chat_participants').insert([
                { conversation_id: newRoom.id, user_id: currentUser.id },
                { conversation_id: newRoom.id, user_id: targetUserId }
             ]);
             if (partsErr) console.error("Error creating chat_participants:", partsErr);
             
             await fetchConversations(currentUser.id, allUsers);
             setActiveChat(newRoom.id);
          }
      } catch (err) {
          console.error("Critical Exception in startPrivateChat:", err);
      }
  };

  // ACTION: Start Group Chat
  const startGroupChat = async () => {
     if (!currentUser || !groupName.trim() || selectedGroupMembers.length === 0) return;
     
     const { data: newRoom } = await supabase.from('chat_rooms').insert({ type: 'group', name: groupName.trim() }).select().single();
     if (newRoom) {
         const parts = selectedGroupMembers.map(uid => ({ conversation_id: newRoom.id, user_id: uid }));
         parts.push({ conversation_id: newRoom.id, user_id: currentUser.id });
         
         await supabase.from('chat_participants').insert(parts);
         
         await fetchConversations(currentUser.id, allUsers);
         setActiveChat(newRoom.id);
         setShowNewGroupModal(false);
         setShowNewChatMenu(false);
         setGroupName('');
         setSelectedGroupMembers([]);
     }
  };

  // ACTION: Download Chat Transcript
  const downloadTranscript = () => {
     if (!activeUserUI || !activeFeed || activeFeed.length === 0) return;
     let content = `Chat Transcript: ${activeUserUI.name}\nGenerated: ${new Date().toLocaleString()}\n\n`;
     activeFeed.forEach(msg => {
        const senderObj = allUsers.find(u => u.id === msg.senderId);
        const senderName = senderObj ? `${senderObj.firstName} ${senderObj.lastName}` : 'Unknown';
        content += `[${msg.timestamp}] ${senderName}: ${msg.content || (msg.attachmentUrl ? '(Attachment)' : '')}\n`;
     });
     const blob = new Blob([content], { type: 'text/plain' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `Chat_History_${activeUserUI.name.replace(/\s+/g, '_')}.txt`;
     a.click();
     URL.revokeObjectURL(url);
     setShowChatOptions(false);
  };

  // ACTION: Delete / Leave Chat
  const deleteChatForMe = async () => {
    if (!activeChat || !currentUser) return;
    
    await supabase.from('chat_participants').delete().eq('conversation_id', activeChat).eq('user_id', currentUser.id);
    await fetchConversations(currentUser.id, allUsers);
    setActiveChat(null);
    setShowDeleteModal(false);
  };

  const deleteChatForEveryone = async () => {
    if (!activeChat || !currentUser) return;
    
    // Deleting ALL participants forces a Realtime DELETE webhook dispatch to all connected users, instantly updating their sidebars!
    await supabase.from('chat_participants').delete().eq('conversation_id', activeChat);
    // Then safely destroy the underlying room to cascade delete messages/storage permanently
    await supabase.from('chat_rooms').delete().eq('id', activeChat);
    
    await fetchConversations(currentUser.id, allUsers);
    setActiveChat(null);
    setShowDeleteModal(false);
  };

  if (!currentUser) {
     return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Loading Live Chat...</div>;
  }

  return (
    <div className={styles.container}>
      
      {/* FULL SCREEN ATTACHMENT VIEW */}
      {selectedImage && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '16px' }}>
            <a href={selectedImage} target="_blank" rel="noopener noreferrer" download="attachment.png" style={{ padding: '8px', backgroundColor: '#374151', borderRadius: '50%', color: 'white', display: 'flex' }}><Download size={24} /></a>
            <div onClick={() => setSelectedImage(null)} style={{ padding: '8px', backgroundColor: '#ef4444', borderRadius: '50%', color: 'white', cursor: 'pointer', display: 'flex' }}><X size={24} /></div>
          </div>
          <img src={selectedImage} alt="Attachment" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
      )}

      {/* NEW CHAT / GROUP CHAT MENU MODAL */}
      {showNewChatMenu && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '400px', backgroundColor: 'white', zIndex: 100, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#00a884', color: 'white', padding: '30px 20px 16px', display: 'flex', alignItems: 'center', gap: '20px' }}>
             <ArrowLeft style={{ cursor: 'pointer' }} onClick={() => setShowNewChatMenu(false)} />
             <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>New chat</h2>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div 
               onClick={() => setShowNewGroupModal(true)}
               style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', borderBottom: '1px solid #f0f2f5', gap: '16px' }}
            >
               <div style={{ width: '48px', height: '48px', backgroundColor: '#00a884', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <Users size={24} />
               </div>
               <span style={{ fontSize: '16px' }}>New group</span>
            </div>

            <div style={{ padding: '16px 20px 8px', fontSize: '14px', color: '#00a884', fontWeight: 600 }}>Contacts on Busy Bees</div>
            
            {allUsers.filter(u => u.id !== currentUser.id).map(user => (
              <div 
                 key={user.id} 
                 onClick={() => startPrivateChat(user.id)}
                 style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid #f0f2f5', gap: '16px' }}
              >
                 <img 
                    src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName)}+${encodeURIComponent(user.lastName)}`} 
                    alt={user.firstName} 
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                 />
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '16px' }}>{user.firstName} {user.lastName}</span>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{user.email}</span>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW GROUP SETUP MODAL */}
      {showNewGroupModal && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '400px', backgroundColor: 'white', zIndex: 110, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
          <div style={{ backgroundColor: '#00a884', color: 'white', padding: '30px 20px 16px', display: 'flex', alignItems: 'center', gap: '20px' }}>
             <ArrowLeft style={{ cursor: 'pointer' }} onClick={() => setShowNewGroupModal(false)} />
             <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Add group participants</h2>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid #f0f2f5' }}>
             <input autoFocus type="text" placeholder="Group Subject" value={groupName} onChange={(e) => setGroupName(e.target.value)} style={{ padding: '10px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '6px' }} />
             {groupName && selectedGroupMembers.length > 0 && (
                <button onClick={startGroupChat} style={{ padding: '10px', backgroundColor: '#00a884', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Create Group</button>
             )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {allUsers.filter(u => u.id !== currentUser.id).map(user => {
               const isSelected = selectedGroupMembers.includes(user.id);
               return (
                  <div 
                     key={user.id} 
                     onClick={() => isSelected ? setSelectedGroupMembers(prev => prev.filter(id => id !== user.id)) : setSelectedGroupMembers(prev => [...prev, user.id])}
                     style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid #f0f2f5', gap: '16px', backgroundColor: isSelected ? '#f0f9ff' : 'transparent' }}
                  >
                     <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid #00a884', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         {isSelected && <Check size={14} color="#00a884" />}
                     </div>
                     <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName)}`} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                     <span style={{ fontSize: '16px' }}>{user.firstName} {user.lastName}</span>
                  </div>
               );
            })}
          </div>
        </div>
      )}

      {/* DELETE CHAT MODAL */}
      {showDeleteModal && (
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', width: '380px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}>
             <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><X size={20} color="#ef4444" /> Delete this chat?</h3>
             <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '14px', lineHeight: 1.5 }}>
               This will remove the chat natively from the sidebar system. You can choose to delete your own copy, or permanently delete it for everyone.
             </p>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={deleteChatForMe} style={{ padding: '12px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}>
                  Delete for me
                </button>
                <button onClick={deleteChatForEveryone} style={{ padding: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}>
                  Delete for everyone
                </button>
                <button onClick={() => setShowDeleteModal(false)} style={{ padding: '12px', backgroundColor: 'transparent', color: '#6b7280', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '14px', marginTop: '4px' }} onMouseEnter={(e) => e.currentTarget.style.color = '#374151'} onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}>
                  Cancel
                </button>
             </div>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR - CONVERSATION LIST */}
      <div className={`${styles.sidebar} ${activeChat ? styles.hiddenMobile : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.avatarContainer} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.firstName)}&background=000&color=fff`} alt="My Avatar" className={styles.avatarImage} style={{ width: '40px', height: '40px' }} />
             <span style={{fontWeight: 600}}>{currentUser.firstName}</span>
          </div>
          <div className={styles.headerIcons}>
            <Plus size={20} className={styles.icon} onClick={() => setShowNewChatMenu(true)} title="New Chat" />
            <MoreVertical size={20} className={styles.icon} />
          </div>
        </div>

        <div className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <Search size={16} color="#6b7280" />
            <input type="text" placeholder="Search or start new chat" className={styles.searchInput} />
          </div>
        </div>

        <div className={styles.conversationsList}>
          {conversations.map(chat => {
            const chatMessages = messages.filter(m => m.conversationId === chat.id);
            const lastMsg = chatMessages[chatMessages.length - 1];
            const unreadCount = chatMessages.filter(m => m.senderId !== currentUser?.id && m.status !== 'read').length;

            return (
              <div key={chat.id} onClick={() => setActiveChat(chat.id)} className={`${styles.conversationItem} ${activeChat === chat.id ? styles.activeConversation : ''}`}>
                <div className={styles.avatarContainer} style={{ width: 48, height: 48, marginRight: 16 }}>
                  <img src={chat.avatar} alt={chat.name} className={styles.avatarImage} />
                </div>
                <div className={styles.convoDetails}>
                  <div className={styles.convoTop}>
                    <h3 className={styles.convoName}>{chat.name}</h3>
                    {lastMsg && <span className={styles.convoTime}>{lastMsg.timestamp}</span>}
                  </div>
                  <div className={styles.convoBottom}>
                    <p className={styles.convoPreview}>
                        {lastMsg ? (lastMsg.attachmentUrl ? '📷 Attachment' : lastMsg.content) : chat.lastMessage}
                    </p>
                    {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT MAIN AREA - ACTIVE CHAT */}
      <div className={`${styles.chatArea} ${!activeChat ? styles.hiddenMobile : ''}`}>
        <div className={styles.chatBg} />

        {activeChat ? (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderUser}>
                <button className={styles.backButton} onClick={() => { setActiveChat(null); sessionStorage.removeItem('activeChatId'); }}>
                   <ArrowLeft size={24} />
                </button>
                <div className={styles.avatarContainer} style={{ marginRight: 16 }}>
                  <img src={activeUserUI?.avatar} alt={activeUserUI?.name} className={styles.avatarImage} />
                </div>
                <div className={styles.chatHeaderDetails}>
                  <h2>{activeUserUI?.name}</h2>
                  {activeUserUI?.type === 'group' ? <p>Group Chat</p> : <p>Direct Chat</p>}
                </div>
              </div>
              
              <div style={{ position: 'relative' }} ref={chatOptionsRef}>
                 <MoreVertical size={20} className={styles.icon} onClick={() => setShowChatOptions(!showChatOptions)} />
                 {showChatOptions && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', border: '1px solid #e5e7eb', zIndex: 100, minWidth: '180px', overflow: 'hidden' }}>
                       <div onClick={downloadTranscript} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '14px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <Download size={16} /> Download Chat
                       </div>
                       <div onClick={() => { setShowChatOptions(false); setShowDeleteModal(true); }} style={{ padding: '12px 16px', cursor: 'pointer', fontSize: '14px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fef2f2' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}>
                          <X size={16} /> {activeUserUI?.type === 'group' ? 'Leave/Delete Group' : 'Delete Chat'}
                       </div>
                    </div>
                 )}
              </div>
            </div>

            <div className={styles.messageFeed}>
              {activeFeed.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                const senderObj = allUsers.find(u => u.id === msg.senderId);
                const avatarUrl = isMe 
                  ? currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.firstName)}`
                  : senderObj?.avatar || `https://ui-avatars.com/api/?name=Unknown`;

                return (
                  <div key={msg.id} className={`${styles.messageRow} ${isMe ? styles.messageRowSent : styles.messageRowReceived}`} style={{ alignItems: 'flex-end', display: 'flex' }}>
                    
                    {!isMe && (
                      <div className={styles.avatarContainer} style={{ width: 28, height: 28, margin: '0 8px 4px 0', flexShrink: 0 }}>
                          <img src={avatarUrl} alt="Avatar" className={styles.avatarImage} />
                      </div>
                    )}
                    
                    <div className={`${styles.messageBubble} ${isMe ? styles.bubbleSent : styles.bubbleReceived}`}>
                      {!isMe && activeUserUI?.type === 'group' && (
                         <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, display: 'block', marginBottom: '2px' }}>{senderObj?.firstName} {senderObj?.lastName}</span>
                      )}
                      {msg.attachmentUrl && (
                        <img src={msg.attachmentUrl} alt="Attachment" onClick={() => setSelectedImage(msg.attachmentUrl!)} style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', cursor: 'pointer', marginBottom: msg.content ? '8px' : '0' }} />
                      )}
                      {msg.content && <p className={styles.messageText}>{msg.content}</p>}
                      <span className={styles.messageTime} style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                        {msg.timestamp}
                        {isMe && (
                           msg.status === 'read' ? <CheckCheck size={14} color="#3b82f6" /> : <Check size={14} color="#3b82f6" />
                        )}
                      </span>
                    </div>
                    
                    {isMe && (
                      <div className={styles.avatarContainer} style={{ width: 28, height: 28, margin: '0 0 4px 8px', flexShrink: 0 }}>
                          <img src={avatarUrl} alt="Avatar" className={styles.avatarImage} />
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={feedEndRef} />
            </div>
            
            {pendingAttachment && (
              <div style={{ position: 'absolute', bottom: '64px', left: 0, right: 0, backgroundColor: '#f9fafb', padding: '16px', borderTop: '1px solid #e5e7eb', zIndex: 20 }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={pendingAttachment.url} alt="Preview" style={{ height: '80px', borderRadius: '8px', border: '2px solid #00a884', opacity: isUploading ? 0.5 : 1 }} />
                  {!isUploading && (
                      <div onClick={() => setPendingAttachment(null)} style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={14} />
                      </div>
                  )}
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                    {pendingAttachment.name} {isUploading ? '(Uploading...)' : ''}
                </p>
              </div>
            )}

            {showEmojiPicker && (
              <div style={{ position: 'absolute', bottom: '70px', left: '16px', backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', zIndex: 30, width: '200px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {COMMON_EMOJIS.map(emoji => (
                    <span key={emoji} style={{ fontSize: '24px', cursor: 'pointer', userSelect: 'none' }} onClick={() => { setMessageText(prev => prev + emoji); setShowEmojiPicker(false); }}>
                      {emoji}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.inputBar}>
              <Smile size={24} className={styles.icon} onClick={() => !isUploading && setShowEmojiPicker(!showEmojiPicker)} color={showEmojiPicker ? '#00a884' : '#6b7280'} style={{ opacity: isUploading ? 0.5 : 1 }} />
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileSelect} disabled={isUploading} />
              <Paperclip size={20} className={styles.icon} style={{ flexShrink: 0, opacity: isUploading ? 0.5 : 1 }} onClick={() => !isUploading && fileInputRef.current?.click()} />
              <div className={styles.inputWrapper}>
                <input type="text" placeholder={isUploading ? "Sending..." : "Type a message"} className={styles.inputField} value={messageText} onChange={(e) => setMessageText(e.target.value)} disabled={isUploading} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendMessage(); } }} />
              </div>
              {messageText.trim() || pendingAttachment ? (
                <div className={`${styles.sendButton} ${isUploading ? '' : styles.sendButtonActive}`} onClick={handleSendMessage}>
                  <Send size={20} className={isUploading ? styles.sendIconDisabled : styles.sendIconActive} style={{ transform: 'translateX(2px)' }} />
                </div>
              ) : (
                <div className={styles.sendButton}>
                  <Send size={20} className={styles.sendIconDisabled} style={{ transform: 'translateX(2px)' }} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexDirection: 'column' }}>
             <img src="https://ui-avatars.com/api/?name=Busy+Bees&background=facc15&color=000" style={{ width: '80px', borderRadius: '50%', marginBottom: '16px' }} />
             <h2>Welcome to Busy Bees Chat</h2>
             <p>Select a contact or create a new group to start messaging.</p>
             <p style={{ marginTop: '40px', fontSize: '11px', fontFamily: 'monospace', opacity: 0.5, maxWidth: '400px', textAlign: 'center', wordWrap: 'break-word' }}>Diagnostic: {debugInfo}</p>
          </div>
        )}
      </div>
    </div>
  );
};
