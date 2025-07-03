const OCR_API_KEY = 'K89518029288957'

export interface OCRResult {
  text: string
  confidence: number
}

export async function extractTextFromImage(imageFile: File): Promise<OCRResult> {
  try {
    const formData = new FormData()
    formData.append('file', imageFile)
    formData.append('apikey', OCR_API_KEY)
    formData.append('language', 'eng')
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')
    formData.append('OCREngine', '2')

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status}`)
    }

    const result = await response.json()

    if (result.IsErroredOnProcessing) {
      throw new Error(`OCR processing error: ${result.ErrorMessage}`)
    }

    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      throw new Error('No text found in image')
    }

    const parsedResult = result.ParsedResults[0]
    
    return {
      text: parsedResult.ParsedText || '',
      confidence: parsedResult.TextOverlay?.HasOverlay ? 0.8 : 0.6
    }
  } catch (error) {
    console.error('OCR Error:', error)
    throw new Error('Failed to extract text from image')
  }
}

export async function extractTextFromMultipleImages(imageFiles: File[]): Promise<string> {
  try {
    const results = await Promise.all(
      imageFiles.map(file => extractTextFromImage(file))
    )

    // Combine all extracted text
    return results
      .map((result, index) => {
        if (result.text.trim()) {
          return `[Page ${index + 1}]\n${result.text.trim()}`
        }
        return ''
      })
      .filter(text => text.length > 0)
      .join('\n\n')
  } catch (error) {
    console.error('Multiple OCR Error:', error)
    throw new Error('Failed to extract text from images')
  }
}