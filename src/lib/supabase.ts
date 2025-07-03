import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://your-project.supabase.co'
const supabaseKey = 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'teacher' | 'student'
          full_name: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'teacher' | 'student'
          full_name: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'teacher' | 'student'
          full_name?: string
          created_at?: string
        }
      }
      classes: {
        Row: {
          id: string
          name: string
          subject: string
          teacher_id: string
          class_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          subject: string
          teacher_id: string
          class_code: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          subject?: string
          teacher_id?: string
          class_code?: string
          created_at?: string
        }
      }
      homework: {
        Row: {
          id: string
          title: string
          description: string
          question_text?: string
          question_image_url?: string
          class_id: string
          teacher_id: string
          due_date?: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          question_text?: string
          question_image_url?: string
          class_id: string
          teacher_id: string
          due_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          question_text?: string
          question_image_url?: string
          class_id?: string
          teacher_id?: string
          due_date?: string
          created_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          homework_id: string
          student_id: string
          answer_images: string[]
          extracted_text?: string
          ai_score?: number
          ai_feedback?: any
          submitted_at: string
          evaluated_at?: string
        }
        Insert: {
          id?: string
          homework_id: string
          student_id: string
          answer_images: string[]
          extracted_text?: string
          ai_score?: number
          ai_feedback?: any
          submitted_at?: string
          evaluated_at?: string
        }
        Update: {
          id?: string
          homework_id?: string
          student_id?: string
          answer_images?: string[]
          extracted_text?: string
          ai_score?: number
          ai_feedback?: any
          submitted_at?: string
          evaluated_at?: string
        }
      }
      class_enrollments: {
        Row: {
          id: string
          class_id: string
          student_id: string
          enrolled_at: string
        }
        Insert: {
          id?: string
          class_id: string
          student_id: string
          enrolled_at?: string
        }
        Update: {
          id?: string
          class_id?: string
          student_id?: string
          enrolled_at?: string
        }
      }
    }
  }
}