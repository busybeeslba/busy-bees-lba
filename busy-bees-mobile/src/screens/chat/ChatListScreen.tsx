import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { COLORS, FONTS } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { Search, User } from 'lucide-react-native';

export interface ChatUI {
    id: string;
    name: string;
    avatar: string;
    lastMessage: string;
    timestamp: string;
    unread: number;
    targetUserId: string;
}

export const ChatListScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { user } = useAppStore();
    const [conversations, setConversations] = useState<ChatUI[]>([]);
    const [loading, setLoading] = useState(true);

    const loadConversations = async () => {
        if (!user?.email) return;

        try {
            // Get DB user id from auth email
            const { data: dbUsers } = await supabase.from('users').select('*');
            if (!dbUsers) return;

            const currentUser = dbUsers.find(u => String(u.email).toLowerCase() === String(user.email).toLowerCase());
            if (!currentUser) return;

            const cacheBuster = Math.random().toString(36).substring(7);

            // 1. Initial Standard Lookup
            let myParticipations: any[] = [];
            const { data: standardParts } = await supabase.from('chat_participants').select('conversation_id').eq('user_id', currentUser.id);
            myParticipations = standardParts || [];

            // 2. Ultimate Fallback Native Scan
            if (myParticipations.length === 0) {
                const { data: visibleMessages } = await supabase.from('chat_messages').select('conversation_id').neq('id', cacheBuster);
                if (visibleMessages && visibleMessages.length > 0) {
                    const uniqueRoomIds = Array.from(new Set(visibleMessages.map(m => m.conversation_id)));
                    myParticipations = uniqueRoomIds.map(id => ({ conversation_id: id }));
                }
            }

            if (myParticipations.length > 0) {
                const roomIds = myParticipations.map(p => p.conversation_id);
                const { data: allParticipants } = await supabase.from('chat_participants').select('*').in('conversation_id', roomIds);
                const { data: messagesFallback } = await supabase.from('chat_messages').select('sender_id, conversation_id').in('conversation_id', roomIds).neq('sender_id', currentUser.id);

                const uis: ChatUI[] = [];

                for (const roomId of roomIds) {
                    let otherUserId = allParticipants?.find(p => p.conversation_id === roomId && p.user_id !== currentUser.id)?.user_id;

                    if (!otherUserId && messagesFallback) {
                        const fb = messagesFallback.find(m => m.conversation_id === roomId);
                        if (fb) otherUserId = fb.sender_id;
                    }

                    if (otherUserId) {
                        const otherUserObj = dbUsers.find(u => u.id === otherUserId);
                        
                        // Get latest message
                        const { data: latestMsgs } = await supabase.from('chat_messages').select('*').eq('conversation_id', roomId).order('created_at', { ascending: false }).limit(1);
                        
                        // Get Unreads
                        const { count: unreadCount } = await supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('conversation_id', roomId).neq('sender_id', currentUser.id).neq('status', 'read');

                        if (otherUserObj) {
                            uis.push({
                                id: roomId,
                                name: `${otherUserObj.firstName} ${otherUserObj.lastName}`.trim(),
                                avatar: otherUserObj.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUserObj.firstName)}&background=random`,
                                lastMessage: latestMsgs && latestMsgs.length > 0 ? latestMsgs[0].content : 'Say hello...',
                                timestamp: latestMsgs && latestMsgs.length > 0 ? new Date(latestMsgs[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                                unread: unreadCount || 0,
                                targetUserId: otherUserObj.id
                            });
                        }
                    }
                }
                setConversations(uis);
            }
        } catch (error) {
            console.error('Mobile fetch conversations error', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConversations();
    }, [user]);

    // Handle global native event bounce if implemented later seamlessly
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
             loadConversations(); // refresh when tab is tapped
        });
        return unsubscribe;
    }, [navigation]);

    const renderItem = ({ item }: { item: ChatUI }) => (
        <TouchableOpacity 
            style={styles.chatItem} 
            onPress={() => navigation.navigate('ChatRoom', { 
                roomId: item.id, 
                targetUserId: item.targetUserId,
                targetUserName: item.name,
                targetAvatar: item.avatar 
            })}
        >
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <View style={styles.chatInfo}>
                <View style={styles.nameRow}>
                    <Text style={styles.chatName}>{item.name}</Text>
                    <Text style={styles.timestamp}>{item.timestamp}</Text>
                </View>
                <View style={styles.messageRow}>
                    <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
                    {item.unread > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unread}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <Text style={styles.title}>Chats</Text>
            </View>
            
            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Search size={18} color="#9ca3af" />
                    <Text style={styles.searchPlaceholder}>Search or start new chat...</Text>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : conversations.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <User size={30} color="#9CA3AF" />
                    </View>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#374151' }}>No Conversations Yet</Text>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>Select a contact from your directory to start chatting.</Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontFamily: FONTS.bold,
        color: '#111827'
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6'
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8
    },
    searchPlaceholder: {
        color: '#9ca3af',
        fontFamily: FONTS.regular,
        fontSize: 15
    },
    chatItem: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f9fafb'
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 14,
        backgroundColor: '#e5e7eb'
    },
    chatInfo: {
        flex: 1,
        justifyContent: 'center'
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    chatName: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: '#111827'
    },
    timestamp: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: '#6b7280'
    },
    messageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    lastMessage: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: '#6b7280',
        flex: 1,
        marginRight: 10
    },
    unreadBadge: {
        backgroundColor: '#25D366',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6
    },
    unreadText: {
        color: '#fff',
        fontSize: 11,
        fontFamily: FONTS.bold
    }
});
