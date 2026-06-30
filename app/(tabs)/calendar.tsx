import React, { useCallback, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Calendar as CalendarIcon, Check, Clock, Link2, Plus, User } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { bookingService } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import {
  XStack,
  YStack,
  Text,
  Badge,
  Button,
  EmptyState,
  ListRow,
  LoadingState,
  PageHeader,
  Screen,
  Section,
  StatBlock,
  Surface,
  colors,
  toneForStatus,
} from '@/components/ui';

interface Appointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  duration: string;
  status: string;
  startISO: string | null;
}

const DEMO_APPOINTMENTS: Appointment[] = [
  { id: '1', clientName: 'Alex Client', service: 'Deep Tissue', time: '10:00 AM', duration: '90 min', status: 'confirmed', startISO: null },
  { id: '2', clientName: 'Mia Client', service: 'Swedish Massage', time: '2:00 PM', duration: '60 min', status: 'tentative', startISO: null },
  { id: '3', clientName: 'Sam Rivera', service: 'Hot Stone', time: '4:30 PM', duration: '75 min', status: 'confirmed', startISO: null },
];

function channelLabel(channel: string): string {
  switch (channel) {
    case 'webchat':
      return 'Web chat session';
    case 'whatsapp':
      return 'WhatsApp session';
    case 'telegram':
      return 'Telegram session';
    case 'email':
      return 'Email session';
    case 'gv':
      return 'Call session';
    default:
      return 'Session';
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function isToday(iso: string | null): boolean {
  if (!iso) return true;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function CalendarScreen() {
  const { user, isSupabaseConfigured } = useAuth();
  const [selectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>(
    isSupabaseConfigured ? [] : DEMO_APPOINTMENTS
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [connection, setConnection] = useState<{ provider: string; status: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');

  const loadConnection = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    const { data } = await supabase
      .from('calendar_connections')
      .select('provider, status')
      .eq('user_id', user.id)
      .maybeSingle();
    setConnection(data ?? null);
  }, [isSupabaseConfigured, user]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  const connectGoogleCalendar = async () => {
    if (!supabase) return;
    setConnecting(true);
    setConnectError('');
    try {
      const { data, error } = await supabase.functions.invoke('connect-calendar', {
        body: { provider: 'google' },
      });
      if (error) throw error;
      if (!data?.authUrl) throw new Error('Could not start the Google Calendar connection.');
      // Opens Google consent; the calendar-callback function stores the tokens.
      // We re-check the connection when the browser closes.
      await WebBrowser.openBrowserAsync(data.authUrl);
      await loadConnection();
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : 'Could not connect Google Calendar.');
    } finally {
      setConnecting(false);
    }
  };

  const googleConnected = connection?.provider === 'google' && connection.status === 'connected';

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;
    let active = true;
    setLoading(true);
    bookingService
      .listUpcoming(user.id)
      .then((rows) => {
        if (!active) return;
        setAppointments(
          rows.map((booking) => ({
            id: booking.id,
            clientName: booking.clientHandle,
            service: channelLabel(booking.channel),
            time: formatTime(booking.start),
            duration: booking.durationMinutes ? `${booking.durationMinutes} min` : '',
            status: booking.status,
            startISO: booking.start,
          }))
        );
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, isSupabaseConfigured]);

  const todaysAppointments = appointments.filter((appointment) => isToday(appointment.startISO));
  const totalMinutes = todaysAppointments.reduce((sum, appointment) => {
    const minutes = parseInt(appointment.duration, 10);
    return sum + (Number.isFinite(minutes) ? minutes : 0);
  }, 0);
  const uniqueClients = new Set(todaysAppointments.map((appointment) => appointment.clientName)).size;
  const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

  return (
    <Screen>
      <PageHeader
        title="Calendar"
        subtitle={formatDate(selectedDate)}
        action={<Button icon={Plus}>Add</Button>}
      />

      {loading ? (
        <LoadingState variant="stats" />
      ) : (
        <XStack flexWrap="wrap" gap={12}>
          <YStack flex={1} minWidth={150}>
            <StatBlock label="Appointments" value={String(todaysAppointments.length)} icon={CalendarIcon} tone="info" />
          </YStack>
          <YStack flex={1} minWidth={150}>
            <StatBlock label="Minutes booked" value={String(totalMinutes)} icon={Clock} tone="success" />
          </YStack>
          <YStack flex={1} minWidth={150}>
            <StatBlock label="Clients" value={String(uniqueClients)} icon={User} tone="primary" />
          </YStack>
        </XStack>
      )}

      {isSupabaseConfigured ? (
        <Section title="Calendar sync">
          <YStack gap={10}>
            <Surface tone="success">
              <XStack alignItems="center" gap={8}>
                <Check size={16} color={colors.success} />
                <YStack flex={1} gap={2}>
                  <Text fontSize={14} fontWeight="700" color={colors.text}>
                    Internal calendar — always on
                  </Text>
                  <Text fontSize={12} color={colors.textMuted}>
                    Every confirmed booking is saved here automatically. No external account needed.
                  </Text>
                </YStack>
              </XStack>
            </Surface>

            <Surface tone={googleConnected ? 'success' : 'neutral'}>
              <XStack alignItems="center" justifyContent="space-between" gap={12} flexWrap="wrap">
                <YStack flex={1} minWidth={180} gap={2}>
                  <XStack alignItems="center" gap={8}>
                    {googleConnected ? <Check size={16} color={colors.success} /> : <Link2 size={16} color={colors.textMuted} />}
                    <Text fontSize={14} fontWeight="700" color={colors.text}>
                      {googleConnected ? 'Google Calendar connected' : 'Google Calendar (optional)'}
                    </Text>
                  </XStack>
                  <Text fontSize={12} color={colors.textMuted}>
                    {googleConnected
                      ? 'Bookings are also mirrored to your Google Calendar.'
                      : 'Connect Google to mirror bookings onto your personal calendar too.'}
                  </Text>
                </YStack>
                {!googleConnected ? (
                  <Button icon={Link2} onPress={connectGoogleCalendar} disabled={connecting}>
                    {connecting ? 'Opening Google…' : 'Connect Google Calendar'}
                  </Button>
                ) : null}
              </XStack>
              {connectError ? (
                <Text fontSize={12} color={colors.danger} style={{ marginTop: 8 }}>
                  {connectError}
                </Text>
              ) : null}
            </Surface>
          </YStack>
        </Section>
      ) : null}

      <Section title="Schedule">
        {loading ? (
          <LoadingState rows={3} />
        ) : todaysAppointments.length === 0 ? (
          <EmptyState title="No appointments today" message="Confirmed and tentative bookings will appear here." />
        ) : (
          <YStack gap={10}>
            {todaysAppointments.map((appointment) => (
              <ListRow
                key={appointment.id}
                title={appointment.clientName}
                subtitle={`${appointment.service}${appointment.duration ? `, ${appointment.duration}` : ''}`}
                meta={appointment.time}
                icon={CalendarIcon}
                badge={<Badge tone={toneForStatus(appointment.status)}>{appointment.status}</Badge>}
              />
            ))}
          </YStack>
        )}
      </Section>

      <Section title="Availability">
        <XStack flexWrap="wrap" gap={8}>
          {timeSlots.map((slot) => {
            const booked = todaysAppointments.some((appointment) => appointment.time === slot);
            return (
              <Surface key={slot} tone={booked ? 'neutral' : 'primary'} style={{ opacity: booked ? 0.55 : 1 }}>
                <Text fontSize={13} fontWeight="700" color={booked ? colors.textMuted : colors.primary}>
                  {slot}
                </Text>
              </Surface>
            );
          })}
        </XStack>
      </Section>
    </Screen>
  );
}
