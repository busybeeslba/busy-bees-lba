import React from 'react';
import { StyleSheet, ImageBackground, View } from 'react-native';

interface MapComponentProps {
    currentLocation: { latitude: number; longitude: number } | null;
}

export const MapComponent: React.FC<MapComponentProps> = ({ currentLocation }) => {
    return (
        <ImageBackground
            source={{ uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPSFVO12h_XB_rJb33z1QgkQXLGv75Cm0A8KZjUhpqM4RI9Tj6QQM2HhamgtAzNy3honCiHw6fYxr8Dvg7zFLMRgJ0NImLsUchFZVorn3LX1Yk0AF_XLlN68mAmq_ylrKf7lF1k3hPMwUFi-U-y-94egotOEpxpjgKIlveyYfUhG_XNWPNA0qiuQYVumuT9QU6sldHnWXSYRhMgLOUeaJ3mYJpEiSm46Z2S96Zu2Cgb-YbxVFjn33qx6Zp5elJhCiM9BVDGkFAczmc" }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
        >
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.05)' }} />
        </ImageBackground>
    );
};
