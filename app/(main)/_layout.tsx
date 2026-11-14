/**
 * Layout principal do app (após login)
 */

import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#F6F3EE',
        },
        headerTintColor: '#1A1714',
        headerTitleStyle: {
          fontFamily: 'PlusJakartaSans-Bold',
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Listou',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="later"
        options={{
          title: 'Mais tarde',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="lists/[id]"
        options={{
          title: 'Lista',
        }}
      />
      <Stack.Screen
        name="lists/new"
        options={{
          title: 'Nova lista',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="goals/[id]"
        options={{
          title: 'Meta',
        }}
      />
    </Stack>
  );
}
