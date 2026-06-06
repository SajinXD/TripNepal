
import { ReactNode } from 'react';
import { ScrollView, ScrollViewProps, View, ViewProps, StyleSheet } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar, StatusBarStyle } from 'expo-status-bar';

interface SafeScreenProps extends ViewProps {
  children: ReactNode;
  edges?: Edge[];
  scrollable?: boolean;
  scrollProps?: ScrollViewProps;
  statusBarStyle?: StatusBarStyle;
  bg?: string;
}

export function SafeScreen({
  children,
  edges = ['top', 'bottom'],
  scrollable = false,
  scrollProps,
  statusBarStyle = 'dark',
  bg = '#F7F7F4',
  style,
  ...rest
}: SafeScreenProps) {
  const Container = scrollable ? ScrollView : View;
  
  const containerStyle = scrollable
    ? [styles.scrollContainer, scrollProps?.contentContainerStyle]
    : [styles.flex1, style];

  return (
    <>
      <StatusBar style={statusBarStyle} />
      <SafeAreaView
        edges={edges}
        style={{ flex: 1, backgroundColor: bg }}
        {...rest}
      >
        <Container 
          {...(scrollable ? scrollProps : {})}
          style={containerStyle}
        >
          {children}
        </Container>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  scrollContainer: { flexGrow: 1 },
});
