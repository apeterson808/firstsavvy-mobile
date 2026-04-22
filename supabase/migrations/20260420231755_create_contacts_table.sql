/*
  # Create contacts table

  A general-purpose contacts table for the Savvy app.
  Each contact belongs to a user (auth.uid) and can store
  personal/professional contact details.

  1. New Tables
    - `contacts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `first_name` (text)
      - `last_name` (text, nullable)
      - `email` (text, nullable)
      - `phone` (text, nullable)
      - `relationship` (text, nullable)
      - `company` (text, nullable)
      - `notes` (text, nullable)
      - `avatar_color` (text) - hex color for avatar background
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Authenticated users can only access their own contacts
*/

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text,
  email text,
  phone text,
  relationship text,
  company text,
  notes text,
  avatar_color text DEFAULT '#2563eb',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts(user_id);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
