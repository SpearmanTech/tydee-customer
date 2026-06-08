// components/Map.web.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Mock the Marker so it doesn't crash if you try to render one
export const Marker = (props: any) => null;
export const PROVIDER_GOOGLE = 'google';
// Render a placeholder gray box instead of the map
export default function MapView(props: any) {
  return (
    <View style={[styles.fallback, props.style]}>
      <Text style={styles.text}>Interactive Map</Text>
      <Text style={styles.subText}>(Use mobile app to view)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  text: {
    color: '#475569',
    fontWeight: 'bold',
  },
  subText: {
    color: '#64748b',
    fontSize: 12,
  }
});