import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = 'AIzaSyCWuYpAHyyK4QNnOEGcJTpmIh00NJLViaw'

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

export interface AIEvaluationResult {
  score: number
  mistakes: string[]
  suggestions: string[]
}

export async function evaluateHomework(
  originalQuestion: string,
  studentAnswer: string
): Promise<AIEvaluationResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
You are an AI teacher evaluating student homework. Please analyze the student's answer against the original question and provide structured feedback.

ORIGINAL QUESTION:
${originalQuestion}

STUDENT'S ANSWER:
${studentAnswer}

Please respond with ONLY a valid JSON object in this exact format:
{
  "score": [number from 0-10],
  "mistakes": ["mistake 1", "mistake 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2"]
}

Rules:
- Score should be between 0-10 based on accuracy, completeness, and understanding
- Mistakes should be specific errors or omissions (max 5 items)
- Suggestions should be brief, actionable advice for improvement (max 2 items)
- Keep all text concise and student-friendly
- If answer is mostly correct, focus on minor improvements
- If answer is incomplete, highlight key missing elements
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response')
    }

    const evaluation = JSON.parse(jsonMatch[0])
    
    // Validate the response structure
    if (typeof evaluation.score !== 'number' || 
        !Array.isArray(evaluation.mistakes) || 
        !Array.isArray(evaluation.suggestions)) {
      throw new Error('Invalid AI response structure')
    }

    return {
      score: Math.max(0, Math.min(10, evaluation.score)),
      mistakes: evaluation.mistakes.slice(0, 5),
      suggestions: evaluation.suggestions.slice(0, 2)
    }
  } catch (error) {
    console.error('Error evaluating homework:', error)
    throw new Error('Failed to evaluate homework with AI')
  }
}