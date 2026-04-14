import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, Image, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS } from '../../constants/theme';
import { ArrowLeft, Send } from 'lucide-react-native';

type ChatRoomRouteProp = RouteProp<RootStackParamList, 'ChatRoom'>;

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    timestamp: string;
    status: string;
}

export const ChatRoomScreen = () => {
    const route = useRoute<ChatRoomRouteProp>();
    const navigation = useNavigation();
    const { user } = useAppStore();
    
    // Fallback if missing payload fields
    const roomId = route.params.roomId;
    const targetUserId = route.params.targetUserId;
    const targetUserName = route.params.targetUserName || "Chat Room";
    const targetAvatar = route.params.targetAvatar || `https://ui-avatars.com/api/?name=User&background=random`;

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const scrollViewRef = useRef<ScrollView>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const fetchInitial = async () => {
             if (!user?.email || !roomId) return;
             
             // Get DB UUID from AppStore email
             const { data: dbUsers } = await supabase.from('users').select('id, email').eq('email', user.email);
             if (dbUsers && dbUsers.length > 0) {
                 const mappedUid = dbUsers[0].id;
                 setCurrentUserId(mappedUid);
                 
                 // Mark unreads natively as read
                 await supabase.from('chat_messages').update({ status: 'read' }).eq('conversation_id', roomId).neq('sender_id', mappedUid);

                 // Fetch History
                 const { data: initialMsgs } = await supabase.from('chat_messages').select('*').eq('conversation_id', roomId).order('created_at', { ascending: true });
                 if (initialMsgs) {
                     setMessages(initialMsgs.map(m => ({
                         id: m.id,
                         conversationId: m.conversation_id,
                         senderId: m.sender_id,
                         content: m.content,
                         timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                         status: m.status || 'sent'
                     })));
                 }
                 setIsLoaded(true);
             }
        };
        fetchInitial();
    }, [user, roomId]);

    // WebSocket Hijacker via DeviceEventEmitter
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('new_chat_message', (dbMsg: any) => {
            if (dbMsg.conversation_id === roomId) {
                const mapped: Message = {
                    id: dbMsg.id,
                    conversationId: dbMsg.conversation_id,
                    senderId: dbMsg.sender_id,
                    content: dbMsg.content,
                    timestamp: new Date(dbMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: dbMsg.status || 'sent'
                };
                setMessages(prev => {
                    if (prev.find(m => m.id === mapped.id)) return prev;
                    return [...prev, mapped];
                });

                // Auto-mark read natively if screen is open
                if (currentUserId && dbMsg.sender_id !== currentUserId) {
                   supabase.from('chat_messages').update({ status: 'read' }).eq('id', dbMsg.id).then();
                }
            }
        });

        return () => sub.remove();
    }, [roomId, currentUserId]);

    const handleSend = async () => {
        if (!inputText.trim() || !currentUserId || !roomId) return;

        const val = inputText.trim();
        setInputText(''); // optimistic clear
        
        const tempId = `temp-${Date.now()}`;
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        setMessages(prev => [...prev, {
            id: tempId,
            conversationId: roomId,
            senderId: currentUserId,
            content: val,
            timestamp: timestamp,
            status: 'sending'
        }]);

        try {
            const { data, error } = await supabase.from('chat_messages').insert({
                conversation_id: roomId,
                sender_id: currentUserId,
                content: val
            }).select('*').single();

            if (!error && data) {
                // If AppNavigator WebSocket doesn't fire fast enough, heal it organically here
                setMessages(prev => prev.map(m => m.id === tempId ? {
                    id: data.id,
                    conversationId: data.conversation_id,
                    senderId: data.sender_id,
                    content: data.content,
                    timestamp: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    status: data.status || 'sent'
                } : m));
            }
        } catch (e) {
            console.error('Mobile send fail', e);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#00a884' }}>
            <KeyboardAvoidingView 
                style={{ flex: 1, backgroundColor: '#EFEAE2' }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Custom WhatsApp Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    
                    <Image source={{ uri: targetAvatar }} style={styles.headerAvatar} />
                    
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerName}>{targetUserName}</Text>
                    </View>
                </View>

                {/* Messages Feed */}
                {!isLoaded ? (
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <ActivityIndicator color={COLORS.primary} size="large" />
                    </View>
                ) : (
                    <ScrollView 
                        ref={scrollViewRef}
                        style={styles.feed}
                        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                    >
                        {messages.map((msg) => {
                            const isMe = msg.senderId === currentUserId;
                            return (
                                <View key={msg.id} style={[styles.bubbleWrapper, isMe ? styles.wrapperSent : styles.wrapperReceived]}>
                                    <View style={[styles.bubble, isMe ? styles.bubbleSent : styles.bubbleReceived]}>
                                        <Text style={styles.messageText}>{msg.content}</Text>
                                        <Text style={styles.messageTime}>{msg.timestamp}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                )}

                {/* Input Bar */}
                <View style={[styles.inputBar, { paddingBottom: Platform.OS === 'ios' ? 8 : 12 }]}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.inputField}
                            placeholder="Message"
                            placeholderTextColor="#8696a0"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={1000}
                        />
                    </View>
                    <TouchableOpacity 
                        style={[styles.sendButton, inputText.trim() ? styles.sendActive : styles.sendDisabled]}
                        disabled={!inputText.trim()}
                        onPress={handleSend}
                    >
                        <Send size={18} color="#fff" style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    header: {
        height: 60,
        backgroundColor: '#00a884',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: Platform.OS === 'android' ? 10 : 0
    },
    backButton: {
        padding: 5,
        marginRight: 2
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
        backgroundColor: '#e5e7eb'
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center'
    },
    headerName: {
        color: '#fff',
        fontFamily: FONTS.bold,
        fontSize: 16
    },
    feed: {
        flex: 1
    },
    bubbleWrapper: {
        flexDirection: 'row',
        marginBottom: 8
    },
    wrapperSent: {
        justifyContent: 'flex-end'
    },
    wrapperReceived: {
        justifyContent: 'flex-start'
    },
    bubble: {
        maxWidth: '75%',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
        position: 'relative'
    },
    bubbleSent: {
        backgroundColor: '#d9fdd3',
        borderTopRightRadius: 4
    },
    bubbleReceived: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 4
    },
    messageText: {
        fontSize: 15,
        color: '#111b21',
        fontFamily: FONTS.regular,
        lineHeight: 20
    },
    messageTime: {
        fontSize: 10,
        color: '#667781',
        alignSelf: 'flex-end',
        marginTop: 4,
        marginLeft: 12
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingTop: 10,
        backgroundColor: '#f0f2f5'
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 24,
        minHeight: 40,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 5,
        marginRight: 8
    },
    inputField: {
        flex: 1,
        fontSize: 15,
        color: '#111b21',
        fontFamily: FONTS.regular,
        maxHeight: 90
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 5 // alignment with input bottom
    },
    sendActive: {
        backgroundColor: '#00a884'
    },
    sendDisabled: {
        backgroundColor: '#9ca3af'
    }
});
