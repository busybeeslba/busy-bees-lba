import React, { forwardRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { COLORS } from '../constants/theme';

interface MapComponentProps {
    currentLocation?: { latitude: number; longitude: number } | null;
    route?: { latitude: number; longitude: number }[];
}

export const MapComponent = forwardRef<MapView, MapComponentProps>(({ currentLocation, route }, ref) => {
    // Determine initial region based on route or current location
    const initialRegion = route && route.length > 0 ? {
        latitude: route[route.length - 1].latitude,
        longitude: route[route.length - 1].longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    } : {
        latitude: currentLocation?.latitude || 37.7749,
        longitude: currentLocation?.longitude || -122.4194,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    return (
        <MapView
            ref={ref}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            region={currentLocation ? {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            } : undefined}
            showsUserLocation={true}
            scrollEnabled={true}
            zoomEnabled={true}
        >
            {route && route.length > 0 && (
                <>
                    <Polyline
                        coordinates={route}
                        strokeColor={COLORS.primary}
                        strokeWidth={4}
                    />
                    {/* Start Marker */}
                    <Marker coordinate={route[0]} title="Start" pinColor="green" />
                    {/* End Marker */}
                    <Marker coordinate={route[route.length - 1]} title="End" pinColor="red" />
                </>
            )}
        </MapView>
    );
});
