import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, BookOpen } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

interface SignUpFormProps {
  onToggleMode: () => void
}

interface School {
  id: string
  name: string
  address: string | null
}

interface Class {
  id: string
  name: string
  subject: string
  school_id: string
}

export function SignUpForm({ onToggleMode }: SignUpFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'teacher' | 'student'>('student')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Teacher-specific fields
  const [schoolName, setSchoolName] = useState('')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [className, setClassName] = useState('')
  const [subject, setSubject] = useState('')
  
  // Student-specific fields
  const [schools, setSchools] = useState<School[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  
  const { toast } = useToast()

  // Fetch schools and classes for students
  useEffect(() => {
    if (role === 'student') {
      fetchSchools()
    }
  }, [role])

  useEffect(() => {
    if (selectedSchoolId) {
      fetchClasses(selectedSchoolId)
    } else {
      setClasses([])
      setSelectedClassId('')
    }
  }, [selectedSchoolId])

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name')
      
      if (error) throw error
      setSchools(data || [])
    } catch (error) {
      console.error('Error fetching schools:', error)
    }
  }

  const fetchClasses = async (schoolId: string) => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', schoolId)
        .order('name')
      
      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const waitForProfile = async (userId: string, maxAttempts = 10): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single()
        
        if (data && !error) {
          return true
        }
        
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.log(`Profile check attempt ${attempt} failed:`, error)
      }
    }
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Basic signup with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Wait for the profile to be created
        const profileCreated = await waitForProfile(authData.user.id)
        
        if (!profileCreated) {
          throw new Error('Profile creation timed out. Please try again.')
        }

        if (role === 'teacher') {
          // Create school and class for teacher
          const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .insert({
              name: schoolName,
              address: schoolAddress || null,
              created_by: authData.user.id
            })
            .select()
            .single()

          if (schoolError) {
            console.error('School creation error:', schoolError)
            throw new Error('Failed to create school')
          }

          if (schoolData) {
            const { error: classError } = await supabase
              .from('classes')
              .insert({
                name: className,
                subject: subject,
                school_id: schoolData.id,
                teacher_id: authData.user.id
              })

            if (classError) {
              console.error('Class creation error:', classError)
              throw new Error('Failed to create class')
            }
          }
        } else if (role === 'student' && selectedClassId) {
          // Enroll student in selected class
          const { error: enrollError } = await supabase
            .from('class_enrollments')
            .insert({
              student_id: authData.user.id,
              class_id: selectedClassId
            })

          if (enrollError) {
            console.error('Enrollment error:', enrollError)
            throw new Error('Failed to enroll in class')
          }
        }

        toast({
          title: "Account created successfully!",
          description: "You can now sign in with your credentials.",
        })

        // Switch to login form
        onToggleMode()
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md animate-fade-in">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 gradient-primary rounded-full flex items-center justify-center mb-2">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
        <CardDescription>
          Join ShikshaCheck and start managing homework
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">I am a</Label>
            <Select value={role} onValueChange={(value: 'teacher' | 'student') => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Teacher-specific fields */}
          {role === 'teacher' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name</Label>
                <Input
                  id="schoolName"
                  type="text"
                  placeholder="Enter school name"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schoolAddress">School Address (Optional)</Label>
                <Input
                  id="schoolAddress"
                  type="text"
                  placeholder="Enter school address"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="className">Class Name</Label>
                <Input
                  id="className"
                  type="text"
                  placeholder="e.g., Grade 10A, Class VII-B"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="e.g., Mathematics, Science, English"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* Student-specific fields */}
          {role === 'student' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="school">Select School</Label>
                <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSchoolId && (
                <div className="space-y-2">
                  <Label htmlFor="class">Select Class</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} - {cls.subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || (role === 'student' && !selectedClassId)}
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onToggleMode}
            className="text-sm text-primary hover:underline"
          >
            Already have an account? Sign in
          </button>
        </div>
      </CardContent>
    </Card>
  )
}