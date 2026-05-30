/*
  # Create AI settings and FAQs tables

  1. New Tables
    - `ai_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users, unique)
      - `enabled` (boolean)
      - `moderation_level` (text)
      - `auto_response` (boolean)
      - `confidence_threshold` (decimal)
      - `learning_enabled` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `faqs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `trigger` (text)
      - `response` (text)
      - `category` (text)
      - `priority` (integer)
      - `active` (boolean)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own data
*/

-- Create AI settings table
CREATE TABLE IF NOT EXISTS ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  moderation_level text DEFAULT 'medium' CHECK (moderation_level IN ('low', 'medium', 'strict')),
  auto_response boolean DEFAULT true,
  confidence_threshold decimal(3,2) DEFAULT 0.7,
  learning_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create FAQs table
CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger text NOT NULL,
  response text NOT NULL,
  category text NOT NULL,
  priority integer DEFAULT 1,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Policies for AI settings
CREATE POLICY "Users can manage own AI settings"
  ON ai_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Policies for FAQs
CREATE POLICY "Users can manage own FAQs"
  ON faqs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for ai_settings updated_at
CREATE TRIGGER update_ai_settings_updated_at
  BEFORE UPDATE ON ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_ai_settings_user_id ON ai_settings(user_id);
CREATE INDEX idx_faqs_user_id ON faqs(user_id);
CREATE INDEX idx_faqs_category ON faqs(category);
CREATE INDEX idx_faqs_active ON faqs(active);