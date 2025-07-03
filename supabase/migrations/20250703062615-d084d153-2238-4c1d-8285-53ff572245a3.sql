-- Disable RLS on all tables temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Everyone can view classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can create classes" ON public.classes;
DROP POLICY IF EXISTS "Teachers can update their own classes" ON public.classes;

DROP POLICY IF EXISTS "Students can view their enrollments" ON public.class_enrollments;
DROP POLICY IF EXISTS "Teachers can view enrollments in their classes" ON public.class_enrollments;
DROP POLICY IF EXISTS "Students can enroll themselves" ON public.class_enrollments;

DROP POLICY IF EXISTS "Students can view homework for enrolled classes" ON public.homework;
DROP POLICY IF EXISTS "Teachers can view their homework" ON public.homework;
DROP POLICY IF EXISTS "Teachers can create homework" ON public.homework;
DROP POLICY IF EXISTS "Teachers can update their homework" ON public.homework;

DROP POLICY IF EXISTS "Students can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Teachers can view submissions for their homework" ON public.submissions;
DROP POLICY IF EXISTS "Students can create their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can update their own submissions" ON public.submissions;

-- Drop storage policies
DROP POLICY IF EXISTS "Students can upload their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own submissions" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can view submissions for their homework" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;