import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { extractTextFromMultipleImages } from '@/lib/ocr'
import { evaluateHomework } from '@/lib/gemini'
import { Upload, FileImage, X, Loader, AlertCircle } from 'lucide-react'

interface SubmissionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  homework: {
    id: string
    title: string
    description: string
    question_text?: string
    question_image_url?: string
  }
  onSubmissionComplete: () => void
}

export function SubmissionModal({ open, onOpenChange, homework, onSubmissionComplete }: SubmissionModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const { profile } = useAuth()
  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid files",
        description: "Please select only image files",
        variant: "destructive"
      })
    }
    
    setSelectedFiles(prev => [...prev, ...imageFiles])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async (files: File[]) => {
    const uploadedUrls: string[] = []
    
    for (const file of files) {
      const fileName = `${profile!.id}/${homework.id}/${Date.now()}_${file.name}`
      
      const { data, error } = await supabase.storage
        .from('submissions')
        .upload(fileName, file)
      
      if (error) throw error
      
      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(fileName)
      
      uploadedUrls.push(urlData.publicUrl)
    }
    
    return uploadedUrls
  }

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one image to submit",
        variant: "destructive"
      })
      return
    }

    try {
      setUploading(true)
      
      // Upload images to Supabase Storage
      const imageUrls = await uploadImages(selectedFiles)
      
      setUploading(false)
      setExtracting(true)
      
      // Extract text from images using OCR
      const extractedText = await extractTextFromMultipleImages(selectedFiles)
      
      setExtracting(false)
      setEvaluating(true)
      
      // Get the original question
      const originalQuestion = homework.question_text || homework.description
      
      // Evaluate using AI
      const evaluation = await evaluateHomework(originalQuestion, extractedText)
      
      setEvaluating(false)
      
      // Save submission to database
      const { error: submissionError } = await supabase
        .from('submissions')
        .insert({
          homework_id: homework.id,
          student_id: profile!.id,
          answer_images: imageUrls,
          extracted_text: extractedText,
          ai_score: evaluation.score,
          ai_feedback: {
            mistakes: evaluation.mistakes,
            suggestions: evaluation.suggestions
          },
          submitted_at: new Date().toISOString(),
          evaluated_at: new Date().toISOString()
        })

      if (submissionError) throw submissionError

      toast({
        title: "Submission successful!",
        description: `Your answer has been submitted and evaluated. Score: ${evaluation.score}/10`,
      })

      onSubmissionComplete()
      onOpenChange(false)
      setSelectedFiles([])
      
    } catch (error: any) {
      console.error('Submission error:', error)
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit your answer. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
      setExtracting(false)
      setEvaluating(false)
    }
  }

  const isProcessing = uploading || extracting || evaluating

  const getProcessingMessage = () => {
    if (uploading) return "Uploading images..."
    if (extracting) return "Extracting text from images..."
    if (evaluating) return "AI is evaluating your answer..."
    return ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Your Answer</DialogTitle>
          <DialogDescription>
            Upload images of your handwritten answer for "{homework.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question Display */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Question:</h4>
              <p className="text-sm">{homework.question_text || homework.description}</p>
              {homework.question_image_url && (
                <div className="mt-3">
                  <img 
                    src={homework.question_image_url} 
                    alt="Question image" 
                    className="max-w-full h-auto rounded-md border"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Upload Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Upload Answer Images</h4>
              <Badge variant="outline">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </Badge>
            </div>

            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                disabled={isProcessing}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">
                  Click to upload images or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, JPEG (Multiple pages supported)
                </p>
              </label>
            </div>

            {/* Selected Files Preview */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Selected Files:</h5>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative">
                      <div className="flex items-center gap-2 p-2 border rounded-lg bg-background">
                        <FileImage className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs truncate flex-1">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeFile(index)}
                          disabled={isProcessing}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Loader className="h-5 w-5 animate-spin text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">{getProcessingMessage()}</p>
                      <p className="text-xs text-blue-600">This may take a few moments...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warning for handwritten answers */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-800 font-medium">Tips for better evaluation:</p>
                    <ul className="text-xs text-amber-700 mt-1 space-y-1">
                      <li>• Write clearly and legibly</li>
                      <li>• Ensure good lighting when taking photos</li>
                      <li>• Upload multiple pages if needed</li>
                      <li>• Keep images straight and in focus</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={selectedFiles.length === 0 || isProcessing}>
            {isProcessing ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Submit Answer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}