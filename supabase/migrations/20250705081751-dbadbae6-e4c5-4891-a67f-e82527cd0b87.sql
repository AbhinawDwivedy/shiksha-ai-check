-- Create schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Create policies for schools
CREATE POLICY "Anyone can view schools" 
ON public.schools 
FOR SELECT 
USING (true);

CREATE POLICY "Teachers can create schools" 
ON public.schools 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their schools" 
ON public.schools 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Update classes table to link to schools
ALTER TABLE public.classes ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.classes ALTER COLUMN school_id SET NOT NULL;

-- Enable RLS on classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create policies for classes
CREATE POLICY "Anyone can view classes" 
ON public.classes 
FOR SELECT 
USING (true);

CREATE POLICY "Teachers can create classes" 
ON public.classes 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their classes" 
ON public.classes 
FOR UPDATE 
USING (auth.uid() = teacher_id);

-- Enable RLS on class_enrollments
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for class_enrollments
CREATE POLICY "Students can view their enrollments" 
ON public.class_enrollments 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Students can enroll themselves" 
ON public.class_enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can leave classes" 
ON public.class_enrollments 
FOR DELETE 
USING (auth.uid() = student_id);

-- Enable RLS on homework
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- Create policies for homework
CREATE POLICY "Students can view homework for their classes" 
ON public.homework 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.class_enrollments 
    WHERE class_id = homework.class_id 
    AND student_id = auth.uid()
  ) OR auth.uid() = teacher_id
);

CREATE POLICY "Teachers can create homework for their classes" 
ON public.homework 
FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their homework" 
ON public.homework 
FOR UPDATE 
USING (auth.uid() = teacher_id);

-- Enable RLS on submissions
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Create policies for submissions
CREATE POLICY "Students can view their own submissions" 
ON public.submissions 
FOR SELECT 
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view submissions for their homework" 
ON public.submissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.homework 
    WHERE id = submissions.homework_id 
    AND teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can create submissions" 
ON public.submissions 
FOR INSERT 
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their submissions" 
ON public.submissions 
FOR UPDATE 
USING (auth.uid() = student_id);