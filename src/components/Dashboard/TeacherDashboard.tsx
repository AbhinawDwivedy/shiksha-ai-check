import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { 
  BookOpen, 
  Users, 
  FileText, 
  TrendingUp, 
  Plus,
  Calendar,
  BarChart3
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

interface DashboardStats {
  totalClasses: number
  totalHomework: number
  totalSubmissions: number
  averageScore: number
}

interface ScoreDistribution {
  range: string
  count: number
  percentage: number
}

export function TeacherDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalClasses: 0,
    totalHomework: 0,
    totalSubmissions: 0,
    averageScore: 0
  })
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([])
  const [recentHomework, setRecentHomework] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchDashboardData()
    }
  }, [profile])

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const [classesData, homeworkData, submissionsData] = await Promise.all([
        supabase.from('classes').select('id').eq('teacher_id', profile!.id),
        supabase.from('homework').select('id').eq('teacher_id', profile!.id),
        supabase.from('submissions').select('ai_score, homework_id').not('ai_score', 'is', null)
      ])

      // Filter submissions for teacher's homework only
      const teacherHomeworkIds = homeworkData.data?.map(hw => hw.id) || []
      const teacherSubmissions = submissionsData.data?.filter(sub => 
        teacherHomeworkIds.includes(sub.homework_id)
      ) || []

      const avgScore = teacherSubmissions.length > 0 
        ? teacherSubmissions.reduce((sum, sub) => sum + (sub.ai_score || 0), 0) / teacherSubmissions.length
        : 0

      setStats({
        totalClasses: classesData.data?.length || 0,
        totalHomework: homeworkData.data?.length || 0,
        totalSubmissions: teacherSubmissions.length,
        averageScore: Math.round(avgScore * 10) / 10
      })

      // Calculate score distribution
      const distribution = [
        { range: '9-10 (Excellent)', count: 0, percentage: 0 },
        { range: '7-8 (Good)', count: 0, percentage: 0 },
        { range: '5-6 (Average)', count: 0, percentage: 0 },
        { range: '0-4 (Poor)', count: 0, percentage: 0 }
      ]

      teacherSubmissions.forEach(sub => {
        const score = sub.ai_score || 0
        if (score >= 9) distribution[0].count++
        else if (score >= 7) distribution[1].count++
        else if (score >= 5) distribution[2].count++
        else distribution[3].count++
      })

      const total = teacherSubmissions.length
      distribution.forEach(item => {
        item.percentage = total > 0 ? Math.round((item.count / total) * 100) : 0
      })

      setScoreDistribution(distribution)

      // Fetch recent homework
      const recentData = await supabase
        .from('homework')
        .select(`
          *,
          classes(name),
          submissions(count)
        `)
        .eq('teacher_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentHomework(recentData.data || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const chartConfig = {
    excellent: { label: "Excellent", color: "hsl(var(--score-excellent))" },
    good: { label: "Good", color: "hsl(var(--score-good))" },
    average: { label: "Average", color: "hsl(var(--score-average))" },
    poor: { label: "Poor", color: "hsl(var(--score-poor))" }
  }

  const chartData = scoreDistribution.map((item, index) => ({
    range: item.range.split(' ')[0],
    count: item.count,
    fill: Object.values(chartConfig)[index].color
  }))

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

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name}</h1>
          <p className="text-muted-foreground">Here's what's happening with your classes today</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          <Button className="gradient-teacher" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Homework
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">Active classes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Homework Assigned</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHomework}</div>
            <p className="text-xs text-muted-foreground">Total assignments</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">Total evaluated</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}/10</div>
            <p className="text-xs text-muted-foreground">Class performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Score Distribution
            </CardTitle>
            <CardDescription>
              Performance breakdown of all submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Homework */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Homework</CardTitle>
            <CardDescription>
              Your latest assignments and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentHomework.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No homework assigned yet</p>
                  <Button variant="link" className="mt-2">Create your first assignment</Button>
                </div>
              ) : (
                recentHomework.map((homework) => (
                  <div key={homework.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium">{homework.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {homework.classes?.name} • {new Date(homework.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {homework.submissions?.length || 0} submissions
                      </Badge>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}