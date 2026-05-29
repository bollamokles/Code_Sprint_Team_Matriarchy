'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X,
  Download,
  Trash2,
  Plus,
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface UploadContentProps {
  userId: string
  profile: {
    cv_url: string | null
    skills: string[] | null
  } | null
  initialRating?: any
}

export function UploadContent({ userId, profile, initialRating }: UploadContentProps) {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [skills, setSkills] = useState<string[]>(profile?.skills || [])
  const [newSkill, setNewSkill] = useState('')
  const [isSavingSkills, setIsSavingSkills] = useState(false)
  const [rating, setRating] = useState<any>(initialRating)

  function isValidFile(file: File) {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    const maxSize = 5 * 1024 * 1024 // 5MB
    return validTypes.includes(file.type) && file.size <= maxSize
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile)
      setUploadError(null)
      setUploadSuccess(false)
    } else {
      setUploadError('Please upload a PDF, DOC, or DOCX file (max 5MB)')
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile)
      setUploadError(null)
      setUploadSuccess(false)
    } else {
      setUploadError('Please upload a PDF, DOC, or DOCX file (max 5MB)')
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload-cv', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      if (data.rating) {
        setRating(data.rating)
      }

      const skillsRes = await fetch('/api/cv-skills')
      const skillsData = await skillsRes.json()
      if (skillsRes.ok && skillsData.skills?.length) {
        const pills = (skillsData.skills as string[])
          .flatMap((s) => s.split(/[\n,•|-]/g).map((x) => x.trim()))
          .filter((x) => x.length >= 2)
        setSkills(Array.from(new Set(pills)).slice(0, 24))
      }

      setUploadSuccess(true)
      setFile(null)
      router.refresh()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload CV. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove))
  }

  const handleSaveSkills = async () => {
    setIsSavingSkills(true)
    setUploadError(null)
    setUploadSuccess(false)
    
    const supabase = createClient()
    
    // Try to update profiles table first
    const { error } = await supabase
      .from('profiles')
      .update({ 
        skills,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.warn('Profiles table update failed, falling back to auth user metadata:', error)
      // Fallback: Save directly in auth user metadata which is always available
      const { error: authError } = await supabase.auth.updateUser({
        data: { skills }
      })
      if (authError) {
        setUploadError('Failed to save skills: ' + authError.message)
      } else {
        setUploadSuccess(true)
      }
    } else {
      setUploadSuccess(true)
    }
    
    router.refresh()
    setIsSavingSkills(false)
  }

  const tips = [
    {
      icon: Target,
      title: 'Tailor Your CV',
      description: 'Customize your resume for each job application to highlight relevant experience.',
    },
    {
      icon: Sparkles,
      title: 'Use Action Verbs',
      description: 'Start bullet points with strong action verbs like "Led", "Developed", "Achieved".',
    },
    {
      icon: TrendingUp,
      title: 'Quantify Results',
      description: 'Include numbers and metrics to demonstrate your impact (e.g., "Increased sales by 25%").',
    },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Upload className="w-8 h-8 text-primary" />
          Upload CV
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload your resume and manage your skills profile
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Card */}
          <Card className="card-premium animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Resume / CV
              </CardTitle>
              <CardDescription>
                Upload your resume in PDF, DOC, or DOCX format (max 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current CV Status */}
              {profile?.cv_url && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-success/10 border border-success/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <p className="font-medium text-sm">CV Uploaded</p>
                      <p className="text-xs text-muted-foreground">Your resume is on file</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}

              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50',
                  file && 'border-success bg-success/5'
                )}
              >
                <label htmlFor="cv-file" className="sr-only">
                  Upload your CV file
                </label>
                <input
                  id="cv-file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  aria-label="Upload your CV file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {file ? (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-success/20 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={cn(
                      'w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-colors',
                      isDragging ? 'bg-primary/20' : 'bg-muted'
                    )}>
                      <Upload className={cn(
                        'w-8 h-8 transition-colors',
                        isDragging ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {isDragging ? 'Drop your file here' : 'Drag and drop your CV here'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        or click to browse files
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">PDF</Badge>
                      <Badge variant="outline">DOC</Badge>
                      <Badge variant="outline">DOCX</Badge>
                      <span>Max 5MB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {uploadError}
                </div>
              )}

              {/* Success Message */}
              {uploadSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  CV uploaded successfully!
                </div>
              )}

              {/* Upload Button */}
              {file && (
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading}
                  className="w-full shadow-lg shadow-primary/25"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload CV
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* AI Resume Scorecard Section */}
          {rating && (
            <Card className="card-premium border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  AI Resume Scorecard
                </CardTitle>
                <CardDescription>
                  Instant recruitment-grade feedback powered by Gemini 2.5 Flash
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Radial Overall Score */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/40 border border-dashed border-border text-center">
                    <span className="text-sm font-semibold text-muted-foreground mb-4">Overall Score</span>
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="48"
                          className="stroke-muted/30 fill-none"
                          strokeWidth="10"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="48"
                          className="stroke-primary fill-none transition-all duration-1000 ease-out"
                          strokeWidth="10"
                          strokeDasharray={2 * Math.PI * 48}
                          strokeDashoffset={2 * Math.PI * 48 * (1 - (rating.overall_score ?? 7.5) / 10)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-extrabold text-foreground tracking-tighter">
                          {Number(rating.overall_score ?? 0).toFixed(1)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Rating</span>
                      </div>
                    </div>
                    <Badge className="mt-4 font-bold bg-primary/20 text-primary border-primary/30" variant="outline">
                      {rating.overall_score >= 8.5 ? 'Excellent' : rating.overall_score >= 7.0 ? 'Strong Match' : 'Needs Optimization'}
                    </Badge>
                  </div>

                  {/* Criteria Breakdown */}
                  <div className="md:col-span-2 space-y-4 flex flex-col justify-center">
                    {/* Tone & Style */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Tone & Style</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{(rating.criteria?.tone_and_style ?? 7.0).toFixed(1)} / 10</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-1000 ease-out"
                          style={{ width: `${(rating.criteria?.tone_and_style ?? 7.0) * 10}%` }}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Content Quality</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{(rating.criteria?.content ?? 7.0).toFixed(1)} / 10</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000 ease-out"
                          style={{ width: `${(rating.criteria?.content ?? 7.0) * 10}%` }}
                        />
                      </div>
                    </div>

                    {/* Structure */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Formatting & Structure</span>
                        <span className="font-bold text-violet-600 dark:text-violet-400">{(rating.criteria?.structure ?? 7.0).toFixed(1)} / 10</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-1000 ease-out"
                          style={{ width: `${(rating.criteria?.structure ?? 7.0) * 10}%` }}
                        />
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Skills Alignment</span>
                        <span className="font-bold text-sky-600 dark:text-sky-400">{(rating.criteria?.skills ?? 7.0).toFixed(1)} / 10</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-400 transition-all duration-1000 ease-out"
                          style={{ width: `${(rating.criteria?.skills ?? 7.0) * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Narrative Feedback */}
                <div className="pt-4 border-t border-dashed space-y-3">
                  <h4 className="text-sm font-bold text-foreground">AI Recruiter Summary</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground bg-muted/40 p-4 rounded-xl border border-dashed whitespace-pre-line">
                    {rating.feedback}
                  </p>
                </div>

                {/* Strengths & Improvements */}
                <div className="grid gap-4 md:grid-cols-2 pt-2">
                  {rating.strengths && rating.strengths.length > 0 && (
                    <div className="p-4 rounded-xl bg-success/5 border border-success/20 space-y-2">
                      <h5 className="text-xs font-bold text-success flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Key Advantages
                      </h5>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                        {rating.strengths.map((str: string, i: number) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {rating.improvements && rating.improvements.length > 0 && (
                    <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 space-y-2">
                      <h5 className="text-xs font-bold text-warning flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        Priority Fixes Needed
                      </h5>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                        {rating.improvements.map((imp: string, i: number) => (
                          <li key={i}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills Section */}
          <Card className="card-premium animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                Skills
              </CardTitle>
              <CardDescription>
                Add your key skills to help match with relevant opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Skill Input */}
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill (e.g., React, Python, Project Management)"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                />
                <Button onClick={handleAddSkill} disabled={!newSkill.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Skills List */}
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="secondary"
                      className="pl-3 pr-1 py-1.5 gap-1"
                    >
                      {skill}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 rounded-full hover:bg-destructive/20 hover:text-destructive"
                        onClick={() => handleRemoveSkill(skill)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No skills added yet. Add your skills to improve job matching.
                </p>
              )}

              {/* Save Button */}
              {skills.length > 0 && skills.join(',') !== (profile?.skills || []).join(',') && (
                <Button 
                  onClick={handleSaveSkills} 
                  variant="outline" 
                  className="w-full"
                  disabled={isSavingSkills}
                >
                  {isSavingSkills ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Skills'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tips Section */}
        <div className="space-y-6">
          <Card className="card-premium animate-slide-up">
            <CardHeader>
              <CardTitle className="text-lg">Resume Tips</CardTitle>
              <CardDescription>
                Make your CV stand out
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tips.map((tip, index) => {
                const Icon = tip.icon
                return (
                  <div key={index} className="flex gap-3">
                    <div className="p-2 rounded-lg bg-muted h-fit">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tip.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tip.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card className="card-premium bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 animate-slide-up">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold">Need help with your CV?</h3>
                <p className="text-sm text-muted-foreground">
                  Ask our AI assistant for personalized resume feedback and tips.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/assistant')}
                >
                  Get AI Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
