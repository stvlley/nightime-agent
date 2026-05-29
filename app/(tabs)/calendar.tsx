import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Calendar as CalendarIcon
} from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { bookingService } from '@/lib/data';

interface Appointment {
  id: string;
  clientName: string;
  service: string;
  time: string;
  duration: string;
  status: string;
  startISO: string | null;
}

// Demo-mode fallback (no Supabase env): keeps the public web demo populated.
const DEMO_APPOINTMENTS: Appointment[] = [
  { id: '1', clientName: 'John Smith', service: 'Deep Tissue Massage', time: '10:00 AM', duration: '90 min', status: 'confirmed', startISO: null },
  { id: '2', clientName: 'Sarah Wilson', service: 'Swedish Massage', time: '2:00 PM', duration: '60 min', status: 'pending', startISO: null },
  { id: '3', clientName: 'Mike Johnson', service: 'Sports Massage', time: '4:30 PM', duration: '75 min', status: 'confirmed', startISO: null },
];

function channelLabel(channel: string): string {
  switch (channel) {
    case 'whatsapp': return 'WhatsApp session';
    case 'telegram': return 'Telegram session';
    case 'email': return 'Email session';
    case 'gv': return 'Call session';
    default: return 'Session';
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
  if (!iso) return true; // demo rows have no date; always show
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
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
          rows.map((b) => ({
            id: b.id,
            clientName: b.clientHandle,
            service: channelLabel(b.channel),
            time: formatTime(b.start),
            duration: b.durationMinutes ? `${b.durationMinutes} min` : '',
            status: b.status,
            startISO: b.start,
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
  }, [user?.id, isSupabaseConfigured]);

  const todaysAppointments = appointments.filter((a) => isToday(a.startISO));
  const totalMinutes = todaysAppointments.reduce((sum, a) => {
    const n = parseInt(a.duration, 10);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const uniqueClients = new Set(todaysAppointments.map((a) => a.clientName)).size;

  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
    '5:00 PM', '6:00 PM', '7:00 PM'
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return '#10b981';
      case 'pending':
      case 'tentative':
        return '#f59e0b';
      case 'cancelled':
      case 'no_show':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dateNavigation}>
          <TouchableOpacity style={styles.navButton}>
            <ChevronLeft size={24} color="#4f46e5" />
          </TouchableOpacity>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          </View>
          <TouchableOpacity style={styles.navButton}>
            <ChevronRight size={24} color="#4f46e5" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.addButton}>
          <Plus size={20} color="white" />
          <Text style={styles.addButtonText}>Add Appointment</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <CalendarIcon size={20} color="#3b82f6" />
            <Text style={styles.summaryText}>
              {todaysAppointments.length} appointment{todaysAppointments.length === 1 ? '' : 's'} today
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Clock size={20} color="#10b981" />
            <Text style={styles.summaryText}>{totalMinutes} minutes booked</Text>
          </View>
          <View style={styles.summaryItem}>
            <User size={20} color="#8b5cf6" />
            <Text style={styles.summaryText}>
              {uniqueClients} client{uniqueClients === 1 ? '' : 's'} scheduled
            </Text>
          </View>
        </View>

        <View style={styles.appointmentsContainer}>
          <Text style={styles.sectionTitle}>{"Today's Schedule"}</Text>

          {loading ? (
            <ActivityIndicator style={styles.loader} color="#4f46e5" />
          ) : todaysAppointments.length === 0 ? (
            <Text style={styles.emptyText}>No appointments scheduled today.</Text>
          ) : (
            todaysAppointments.map((appointment) => (
            <TouchableOpacity key={appointment.id} style={styles.appointmentCard}>
              <View style={styles.appointmentTime}>
                <Text style={styles.timeText}>{appointment.time}</Text>
                <Text style={styles.durationText}>{appointment.duration}</Text>
              </View>

              <View style={styles.appointmentDetails}>
                <View style={styles.appointmentHeader}>
                  <Text style={styles.clientName}>{appointment.clientName}</Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(appointment.status)}20` }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(appointment.status) }
                    ]}>
                      {appointment.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.serviceText}>{appointment.service}</Text>
              </View>
            </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.availabilityContainer}>
          <Text style={styles.sectionTitle}>Available Time Slots</Text>
          <View style={styles.timeSlotGrid}>
            {timeSlots.map((slot, index) => {
              const isBooked = todaysAppointments.some(apt => apt.time === slot);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeSlot,
                    isBooked && styles.bookedSlot
                  ]}
                  disabled={isBooked}
                >
                  <Text style={[
                    styles.timeSlotText,
                    isBooked && styles.bookedSlotText
                  ]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  addButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  appointmentsContainer: {
    margin: 16,
  },
  loader: {
    marginTop: 32,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 15,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentTime: {
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  durationText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  serviceText: {
    fontSize: 14,
    color: '#6b7280',
  },
  availabilityContainer: {
    margin: 16,
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bookedSlot: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  bookedSlotText: {
    color: '#9ca3af',
  },
});
