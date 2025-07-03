-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class enrollments table
CREATE TABLE public.class_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Create homework table
CREATE TABLE public.homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  question_text TEXT,
  question_image_url TEXT,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create submissions table
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer_images TEXT[] NOT NULL,
  extracted_text TEXT NOT NULL,
  ai_score NUMERIC(3,1),
  ai_feedback JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  evaluated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(homework_id, student_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Create RLS policies for classes
CREATE POLICY "Everyone can view classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Teachers can create classes" ON public.classes FOR INSERT WITH CHECK (auth.uid()::text = teacher_id::text);
CREATE POLICY "Teachers can update their own classes" ON public.classes FOR UPDATE USING (auth.uid()::text = teacher_id::text);

-- Create RLS policies for class enrollments
CREATE POLICY "Students can view their enrollments" ON public.class_enrollments FOR SELECT USING (auth.uid()::text = student_id::text);
CREATE POLICY "Teachers can view enrollments in their classes" ON public.class_enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.classes WHERE id = class_id AND teacher_id::text = auth.uid()::text)
);
CREATE POLICY "Students can enroll themselves" ON public.class_enrollments FOR INSERT WITH CHECK (auth.uid()::text = student_id::text);

-- Create RLS policies for homework
CREATE POLICY "Students can view homework for enrolled classes" ON public.homework FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.class_enrollments WHERE class_id = homework.class_id AND student_id::text = auth.uid()::text)
);
CREATE POLICY "Teachers can view their homework" ON public.homework FOR SELECT USING (auth.uid()::text = teacher_id::text);
CREATE POLICY "Teachers can create homework" ON public.homework FOR INSERT WITH CHECK (auth.uid()::text = teacher_id::text);
CREATE POLICY "Teachers can update their homework" ON public.homework FOR UPDATE USING (auth.uid()::text = teacher_id::text);

-- Create RLS policies for submissions
CREATE POLICY "Students can view their own submissions" ON public.submissions FOR SELECT USING (auth.uid()::text = student_id::text);
CREATE POLICY "Teachers can view submissions for their homework" ON public.submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.homework WHERE id = homework_id AND teacher_id::text = auth.uid()::text)
);
CREATE POLICY "Students can create their own submissions" ON public.submissions FOR INSERT WITH CHECK (auth.uid()::text = student_id::text);
CREATE POLICY "Students can update their own submissions" ON public.submissions FOR UPDATE USING (auth.uid()::text = student_id::text);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create storage policies for submissions
CREATE POLICY "Students can upload their own submissions" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'submissions' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Students can view their own submissions" ON storage.objects FOR SELECT USING (
  bucket_id = 'submissions' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Teachers can view submissions for their homework" ON storage.objects FOR SELECT USING (
  bucket_id = 'submissions'
);

-- Create storage policies for avatars
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();