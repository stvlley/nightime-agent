/*
  # Create appointments table

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `client_name` (text)
      - `client_phone` (text)
      - `service` (text)
      - `datetime` (timestamp)
      - `duration` (integer, minutes)
      - `status` (text)
      - `notes` (text)
      - `reminder_sent` (boolean)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on appointments table
    - Add policy for users to manage their own appointments
*/

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text,
  service text NOT NULL,
  datetime timestamptz NOT NULL,
  duration integer NOT NULL DEFAULT 60, -- minutes
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'cancelled', 'completed')),
  notes text,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Users can manage their own appointments
CREATE POLICY "Users can manage own appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes for better performance
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_datetime ON appointments(datetime);
CREATE INDEX idx_appointments_status ON appointments(status);