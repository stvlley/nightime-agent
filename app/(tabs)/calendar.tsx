import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, Plus, User } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { bookingService } from '@/lib/data';
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
