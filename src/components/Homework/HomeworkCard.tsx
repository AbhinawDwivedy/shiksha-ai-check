import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, FileText, Users, Eye, Upload } from 'lucide-react'
import { format } from 'date-fns'

interface HomeworkCardProps {
  homework: {
    id: string
    title: string
    description: string
    due_date?: string
    created_at: string
    classes: {
      name: string
      subject: string
    }
    submissions?: any[]
  }
  userRole: 'teacher' | 'student'
  isCompleted?: boolean
  onView: () => void
  onSubmit?: () => void
}

export function HomeworkCard({ homework, userRole, isCompleted, onView, onSubmit }: HomeworkCardProps) {
  const isOverdue = homework.due_date && new Date(homework.due_date) < new Date()
  
  return (
    <Card className="hover:shadow-lg transition-all duration-200 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1 line-clamp-1">{homework.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {homework.description}
            </CardDescription>
          </div>
          <div className="flex gap-2 ml-4">
            {userRole === 'student' && (
              <>
                {isCompleted ? (
                  <Badge variant="default" className="text-xs">
                    Completed
                  </Badge>
                ) : (
                  <>
                    {isOverdue ? (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Pending
                      </Badge>
                    )}
                  </>
                )}
              </>
            )}
            {userRole === 'teacher' && (
              <Badge variant="secondary" className="text-xs">
                {homework.submissions?.length || 0} submissions
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Class and Subject Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{homework.classes.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{homework.classes.subject}</span>
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Assigned: {format(new Date(homework.created_at), 'MMM dd, yyyy')}</span>
            </div>
            {homework.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
                <Calendar className="h-4 w-4" />
                <span>Due: {format(new Date(homework.due_date), 'MMM dd, yyyy')}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onView} className="flex-1">
              <Eye className="h-4 w-4 mr-2" />
              {userRole === 'teacher' ? 'View Submissions' : 'View Details'}
            </Button>
            
            {userRole === 'student' && !isCompleted && onSubmit && (
              <Button 
                size="sm" 
                onClick={onSubmit}
                className="flex-1"
                variant={isOverdue ? "destructive" : "default"}
              >
                <Upload className="h-4 w-4 mr-2" />
                Submit Answer
              </Button>
            )}
            
            {userRole === 'teacher' && (
              <Button variant="secondary" size="sm">
                Analytics
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}