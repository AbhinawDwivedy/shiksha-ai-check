-- Fix all backend RLS and authentication issues
-- This migration addresses permission errors and ensures proper setup

-- First, let's fix the foreign key reference in schools table
ALTER TABLE public.schools DROP CONSTRAINT IF EXISTS schools_created_by_fkey;
ALTER TABLE public.schools ADD CONSTRAINT schools_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure all tables have proper constraints
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_school_id_fkey;
ALTER TABLE public.classes ADD CONSTRAINT classes_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

-- Fix the handle_new_user function to properly handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view schools" ON public.schools;
DROP POLICY IF EXISTS "Teachers can create schools" ON public.schools;
DROP POLICY IF EXISTS "Creators can update their schools" ON public.schools;

DROP POLICY IF EXISTS "Anyone can view classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can update their classes" ON public.classes;

DROP POLICY IF EXISTS "Students can view their enrollments" ON public.class_enrollments;
DROP POLICY IF EXISTS "Students can enroll themselves" ON public.class_enrollments;
DROP POLICY IF EXISTS "Students can leave classes" ON public.class_enrollments;

DROP POLICY IF EXISTS "Students can view homework for their classes" ON public.homework;
DROP POLICY IF EXISTS "Teachers can create homework for their classes" ON public.homework;
DROP POLICY IF EXISTS "Teachers can update their homework" ON public.homework;

DROP POLICY IF EXISTS "Students can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can view submissions for their homework" ON public.submissions;
DROP POLICY IF EXISTS "Students can create submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can update their submissions" ON public.submissions;

-- Create proper RLS policies with correct syntax

-- Profiles policies
CREATE POLICY "Enable read access for all users" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Enable update for users based on id" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

-- Schools policies
CREATE POLICY "Anyone can view schools" ON public.schools
  FOR SELECT USING (true);

CREATE POLICY "Teachers can create schools" ON public.schools
  FOR INSERT WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Creators can update their schools" ON public.schools
  FOR UPDATE USING ((select auth.uid()) = created_by);

-- Classes policies
CREATE POLICY "Anyone can view classes" ON public.classes
  FOR SELECT USING (true);

CREATE POLICY "Teachers can create classes" ON public.classes
  FOR INSERT WITH CHECK ((select auth.uid()) = teacher_id);

CREATE POLICY "Teachers can update their classes" ON public.classes
  FOR UPDATE USING ((select auth.uid()) = teacher_id);

-- Class enrollments policies
CREATE POLICY "Students can view their enrollments" ON public.class_enrollments
  FOR SELECT USING ((select auth.uid()) = student_id);

CREATE POLICY "Students can enroll themselves" ON public.class_enrollments
  FOR INSERT WITH CHECK ((select auth.uid()) = student_id);

CREATE POLICY "Students can leave classes" ON public.class_enrollments
  FOR DELETE USING ((select auth.uid()) = student_id);

-- Homework policies
CREATE POLICY "Students can view homework for their classes" ON public.homework
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_enrollments 
      WHERE class_id = homework.class_id 
      AND student_id = (select auth.uid())
    ) OR (select auth.uid()) = teacher_id
  );

CREATE POLICY "Teachers can create homework for their classes" ON public.homework
  FOR INSERT WITH CHECK ((select auth.uid()) = teacher_id);

CREATE POLICY "Teachers can update their homework" ON public.homework
  FOR UPDATE USING ((select auth.uid()) = teacher_id);

-- Submissions policies
CREATE POLICY "Students can view their own submissions" ON public.submissions
  FOR SELECT USING ((select auth.uid()) = student_id);

CREATE POLICY "Teachers can view submissions for their homework" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.homework 
      WHERE id = submissions.homework_id 
      AND teacher_id = (select auth.uid())
    )
  );

CREATE POLICY "Students can create submissions" ON public.submissions
  FOR INSERT WITH CHECK ((select auth.uid()) = student_id);

CREATE POLICY "Students can update their submissions" ON public.submissions
  FOR UPDATE USING ((select auth.uid()) = student_id);

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Students can upload their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view submissions for their homework" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view all submissions" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

-- Create storage policies for submissions
CREATE POLICY "Students can upload their own submissions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'submissions' AND 
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Students can view their own submissions" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'submissions' AND 
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Teachers can view all submissions" ON storage.objects
  FOR SELECT USING (bucket_id = 'submissions');

-- Create storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    (select auth.uid())::text = (storage.foldername(name))[1]
  );

-- Create a function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON public.class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON public.class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_homework_class_id ON public.homework(class_id);
CREATE INDEX IF NOT EXISTS idx_homework_teacher_id ON public.homework(teacher_id);
CREATE INDEX IF NOT EXISTS idx_submissions_homework_id ON public.submissions(homework_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_id);