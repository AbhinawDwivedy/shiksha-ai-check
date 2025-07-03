import { useState } from 'react'
import { LoginForm } from '@/components/Auth/LoginForm'
import { SignUpForm } from '@/components/Auth/SignUpForm'
import { BookOpen, GraduationCap, Users } from 'lucide-react'

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold">ShikshaCheck</h1>
            </div>
            <h2 className="text-4xl font-bold mb-4">
              AI-Powered Homework Management
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Revolutionizing education with intelligent assignment evaluation and insightful analytics
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">For Teachers</h3>
                <p className="text-white/80">
                  Create assignments, track student progress, and get detailed analytics on class performance
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">For Students</h3>
                <p className="text-white/80">
                  Submit handwritten answers, receive instant AI feedback, and track your learning progress
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart Evaluation</h3>
                <p className="text-white/80">
                  Advanced OCR and AI technology provides detailed feedback and personalized suggestions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full"></div>
        <div className="absolute bottom-20 right-20 w-20 h-20 bg-white/10 rounded-full"></div>
        <div className="absolute top-1/2 right-0 w-40 h-40 bg-white/5 rounded-full transform translate-x-20"></div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {isLogin ? (
            <LoginForm onToggleMode={() => setIsLogin(false)} />
          ) : (
            <SignUpForm onToggleMode={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  )
}