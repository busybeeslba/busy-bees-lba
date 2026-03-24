import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Badge } from './Badge';

interface LiveTrackingProps {
    isActive: boolean;
    coordinates: { latitude: number; longitude: number } | null;
}

export const LiveTracking: React.FC<LiveTrackingProps> = ({ isActive, coordinates }) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Live Tracking</Text>
                {isActive ? (
                    <Badge label="GPS ACTIVE" variant="success" />
                ) : (
                    <Badge label="INACTIVE" variant="neutral" />
                )}
            </View>

            <View style={styles.mapContainer}>
                {/* Mock Map Placeholder */}
                <View style={styles.mapPlaceholder}>
                    <MapPin size={40} color={isActive ? "#FFD700" : "#CCC"} />
                    <Text style={styles.coords}>
                        {coordinates
                            ? `${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`
                            : "No active signal"}
                    </Text>
                    {isActive && <Text style={styles.accuracy}>Accuracy: ±5m</Text>}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    mapContainer: {
        height: 180,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#E0E0E0',
    },
    mapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    coords: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    accuracy: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    }
});
