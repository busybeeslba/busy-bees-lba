import { NavigatorScreenParams } from '@react-navigation/native';
import { Session, GeneratedDocument } from '../types';

export type AuthStackParamList = {
    Login: undefined;
};

export type MainTabParamList = {
    Dashboard: undefined;
    Calendar: undefined;
    History: undefined;
    Settings: undefined;
    ChatList: undefined; // INJECT NATIVE CHAT TAB
};

export type RootStackParamList = {
    Auth: NavigatorScreenParams<AuthStackParamList>;
    Main: NavigatorScreenParams<MainTabParamList>;
    SessionDetails: undefined;
    DocumentTemplatePicker: undefined;
    DocumentForm: { templateType: string };
    ChatRoom: { roomId?: string, targetUserId?: string, targetUserName?: string, targetAvatar?: string }; // INJECT CHAT FEED SCREEN
    CompleteSession: undefined;
    SessionCompleted: { session: Session };
    HistoryDetails: { session: Session };
    EditProfile: undefined;
    SetAvailability: undefined;
    BaselineSheet: { program?: string } | undefined;
    MassTrial: { program?: string } | undefined;
    DailyRoutines: { program?: string } | undefined;
    TransactionSheet: undefined;
};
