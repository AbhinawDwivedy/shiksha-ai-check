import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Upload,
  Calendar,
  Target
} from 'lucide-react'

interface StudentStats {
  totalHomework: number
  completedHomework: number
  pendingHomework: number
  averageScore: number
}

interface HomeworkItem {
  id: string
  title: string
  description: string
  due_date: string | null
  created_at: string
  classes: {
    name: string
    subject: string
  }
  submissions: any[]
  isCompleted?: boolean
}

export function StudentDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<StudentStats>({
    totalHomework: 0,
    completedHomework: 0,
    pendingHomework: 0,
    averageScore: 0
  })
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([])
  const [recentScores, setRecentScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchDashboardData()
    }
  }, [profile])

  const fetchDashboardData = async () => {
    try {
      // Get enrolled classes
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', profile!.id)

      const classIds = enrollments?.map(e => e.class_id) || []

      if (classIds.length === 0) {
        setLoading(false)
        return
      }

      // Get homework for enrolled classes
      const { data: homeworkData } = await supabase
        .from('homework')
        .select(`
          *,
          classes(name, subject),
          submissions!submissions_homework_id_fkey(*)
        `)
        .in('class_id', classIds)
        .order('created_at', { ascending: false })

      const homework = homeworkData || []
      
      // Get student's submissions
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', profile!.id)
        .not('ai_score', 'is', null)

      const submissions = submissionsData || []

      // Calculate stats
      const completedHomeworkIds = new Set(submissions.map(s => s.homework_id))
      const completed = homework.filter(hw => completedHomeworkIds.has(hw.id)).length
      const pending = homework.length - completed

      const avgScore = submissions.length > 0 
        ? submissions.reduce((sum, sub) => sum + (sub.ai_score || 0), 0) / submissions.length
        : 0

      setStats({
        totalHomework: homework.length,
        completedHomework: completed,
        pendingHomework: pending,
        averageScore: Math.round(avgScore * 10) / 10
      })

      // Set homework list with submission status
      const homeworkWithStatus = homework.map(hw => ({
        ...hw,
        isCompleted: completedHomeworkIds.has(hw.id)
      }))

      setHomeworkList(homeworkWithStatus)

      // Recent scores for progress tracking
      const recentScoresData = submissions
        .sort((a, b) => new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime())
        .slice(0, 5)
        .map(sub => ({
          score: sub.ai_score,
          homework_title: homework.find(hw => hw.id === sub.homework_id)?.title || 'Unknown',
          date: sub.evaluated_at
        }))

      setRecentScores(recentScoresData)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-score-excellent'
    if (score >= 7) return 'text-score-good'
    if (score >= 5) return 'text-score-average'
    return 'text-score-poor'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 9) return 'default'
    if (score >= 7) return 'secondary'
    if (score >= 5) return 'outline'
    return 'destructive'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const completionRate = stats.totalHomework > 0 
    ? Math.round((stats.completedHomework / stats.totalHomework) * 100) 
    : 0

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name}</h1>
          <p className="text-muted-foreground">Keep up the great work on your assignments!</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          <Button className="gradient-student" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Submit Work
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Homework</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHomework}</div>
            <p className="text-xs text-muted-foreground">Assignments received</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedHomework}</div>
            <p className="text-xs text-muted-foreground">{completionRate}% completion rate</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingHomework}</div>
            <p className="text-xs text-muted-foreground">Need to submit</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
              {stats.averageScore}/10
            </div>
            <p className="text-xs text-muted-foreground">Overall performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progress Overview
          </CardTitle>
          <CardDescription>
            Your homework completion and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Homework Completion</span>
                <span>{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
            {recentScores.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Recent Scores</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentScores.map((score, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{score.homework_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(score.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={getScoreBadgeVariant(score.score)}>
                        {score.score}/10
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Homework List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Homework</CardTitle>
          <CardDescription>
            All assignments from your enrolled classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {homeworkList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No homework assigned yet</p>
                <p className="text-sm">Join a class to start receiving assignments</p>
              </div>
            ) : (
              homeworkList.map((homework) => (
                <div key={homework.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{homework.title}</h4>
                      {homework.isCompleted ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {homework.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{homework.classes.name} • {homework.classes.subject}</span>
                      {homework.due_date && (
                        <span>Due: {new Date(homework.due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant={homework.isCompleted ? "outline" : "default"} 
                      size="sm"
                    >
                      {homework.isCompleted ? "View Results" : "Submit"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}