import React, { useState } from 'react'
import {
  Sparkles,
  Video,
  Cloud,
  HardDrive,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Key,
  ExternalLink,
  Loader2,
  Check,
  X,
  Share2
} from 'lucide-react'
import { useApiKey } from '../../../hooks/useApiKey'
import { useGoogleDrive } from '../../../hooks/useGoogleDrive'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const { apiKey, setApiKey, isConfigured } = useApiKey()
  const { isConnected: isDriveConnected, isConnecting, connect } = useGoogleDrive()
  const [tempApiKey, setTempApiKey] = useState(apiKey)
  const [keySaved, setKeySaved] = useState(false)

  if (!isOpen) return null

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to Embrace AI',
      eyebrow: 'Your intelligent meeting companion',
      description:
        'Embrace runs seamlessly on your Mac, capturing high-fidelity screen and internal audio, and generating automated AI notes with zero friction.'
    },
    {
      id: 'menu-bar',
      title: 'Automated Call Detection',
      eyebrow: 'Never miss a meeting',
      description:
        'Embrace lives discreetly in your Mac Menu Bar. When you join Zoom, Google Meet, or Microsoft Teams, it automatically detects the session so you can record with a single click.'
    },
    {
      id: 'ai-notes',
      title: 'AI Transcripts & Action Items',
      eyebrow: 'Powered by Google Gemini',
      description:
        'Turn conversations into structured intelligence. Every recording is transcribed with speaker attribution, bulleted summaries, and actionable task assignments.'
    },
    {
      id: 'storage',
      title: 'Instant Playback & Cloud Sharing',
      eyebrow: 'Local-first with cloud power',
      description:
        'Watch recordings instantly from your Mac SSD with 0ms delay. Seamlessly back up to Google Drive and share unlisted links with your team in one click.'
    },
    {
      id: 'setup',
      title: 'Quick 30-Second Setup',
      eyebrow: 'Ready to roll',
      description:
        'Configure your Gemini AI key and Google Drive backup now so everything works smoothly out of the box.'
    }
  ]

  const handleNext = (): void => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      onComplete()
    }
  }

  const handleBack = (): void => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSaveKey = (): void => {
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey.trim())
      setKeySaved(true)
      setTimeout(() => setKeySaved(false), 2000)
    }
  }

  const renderStepContent = (): React.ReactElement => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 py-2">
            <div className="grid grid-cols-3 gap-3.5">
              <div className="rounded-xl border border-border bg-card p-4 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Video className="w-5 h-5" />
                </div>
                <h4 className="text-[13px] font-semibold text-foreground">HD Recording</h4>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Crystal-clear display & dual system audio
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="text-[13px] font-semibold text-foreground">AI Intelligence</h4>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Summaries, action items & speaker tags
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 text-center flex flex-col items-center">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Cloud className="w-5 h-5" />
                </div>
                <h4 className="text-[13px] font-semibold text-foreground">Cloud Backups</h4>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Google Drive sync & 1-click link sharing
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/40 p-4 text-[12px] text-muted-foreground leading-relaxed">
              💡 <strong className="text-foreground">Local-first privacy:</strong> Your recordings
              are stored on your local disk first. You control what gets backed up to the cloud.
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[13px] font-semibold text-foreground">
                    Menu Bar Auto-Detection Active
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  macOS Background
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-secondary border border-border">
                  <span className="text-[18px]">📹</span>
                  <p className="text-[12px] font-medium text-foreground mt-1">Google Meet</p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Auto-detected
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-secondary border border-border">
                  <span className="text-[18px]">⚡️</span>
                  <p className="text-[12px] font-medium text-foreground mt-1">Zoom Call</p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Auto-detected
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-secondary border border-border">
                  <span className="text-[18px]">👥</span>
                  <p className="text-[12px] font-medium text-foreground mt-1">MS Teams</p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Auto-detected
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[12px] text-muted-foreground">
              Click the Embrace icon in your Mac Menu Bar at any moment to quickly start or stop
              recordings, check audio levels, and open recent meetings.
            </p>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 font-mono text-[12px]">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-primary font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Gemini AI Output
                </span>
                <span className="text-subtle text-[10px]">Model: gemini-2.5-flash</span>
              </div>

              <div className="space-y-1.5">
                <span className="text-subtle text-[10px] uppercase tracking-wider font-bold">
                  Action Items
                </span>
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Send finalized project roadmap to engineering team</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Review Google Drive unlisted permissions setup</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-1">
                <span className="text-subtle text-[10px] uppercase tracking-wider font-bold">
                  Transcript
                </span>
                <p className="text-muted-foreground truncate">
                  [00:14] <strong className="text-foreground">Alex:</strong> Let&apos;s make sure
                  the video player loads instantly from local disk...
                </p>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-foreground font-semibold text-[13px]">
                  <HardDrive className="w-4 h-4 text-primary" />
                  <span>Instant Local Disk</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  Recorded directly to your Mac. Plays with 0ms latency right as your meeting ends.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-foreground font-semibold text-[13px]">
                  <Cloud className="w-4 h-4 text-emerald-500" />
                  <span>Google Drive Sync</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  Automatic unlisted cloud backup. Click <strong>Share</strong> to copy a viewable
                  link for anyone.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary p-3.5 flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Share button copies direct Drive link:</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-card border border-border text-foreground font-semibold text-[11px]">
                <Share2 className="w-3 h-3" /> Share Link
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4 py-2">
            {/* Gemini API Key */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <h4 className="text-[13px] font-semibold text-foreground">
                    Google Gemini API Key
                  </h4>
                </div>
                {isConfigured && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Configured
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Paste Gemini API key (AIzaSy...)"
                  className="flex-1 h-9 bg-background border border-border rounded-lg px-3 text-[12px] font-mono text-foreground focus:outline-none focus:border-foreground"
                />
                <button
                  type="button"
                  onClick={handleSaveKey}
                  disabled={!tempApiKey.trim() || tempApiKey.trim() === apiKey}
                  className="h-9 px-4 bg-foreground text-background rounded-lg text-[12px] font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {keySaved ? 'Saved!' : 'Save'}
                </button>
              </div>

              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Get a free key from Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Google Drive Connection */}
            <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Cloud className="w-4 h-4 text-subtle" />
                </div>
                <div>
                  <h4 className="text-[13px] font-semibold text-foreground">Google Drive Backup</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isDriveConnected
                      ? 'Connected & ready for auto-sync'
                      : 'Optional cloud backup & link sharing'}
                  </p>
                </div>
              </div>

              {isDriveConnected ? (
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
              ) : (
                <button
                  type="button"
                  onClick={connect}
                  disabled={isConnecting}
                  className="h-8 px-3.5 bg-secondary hover:bg-border text-foreground border border-border rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5"
                >
                  {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect'}
                </button>
              )}
            </div>
          </div>
        )

      default:
        return <div />
    }
  }

  const current = steps[currentStep]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-7 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header with Step Dots & Skip */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-6 bg-foreground'
                    : idx < currentStep
                      ? 'w-2 bg-foreground/40'
                      : 'w-2 bg-secondary'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
            <span className="ml-2 text-[11px] text-subtle font-medium">
              {currentStep + 1} of {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step Header */}
        <div>
          <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
            {current.eyebrow}
          </span>
          <h2 className="text-[22px] font-bold text-foreground tracking-tight mt-1">
            {current.title}
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Step Body Content */}
        <div className="min-h-[170px]">{renderStepContent()}</div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="h-9 px-4 rounded-lg text-[13px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-0 transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNext}
              className="h-9 px-5 bg-foreground text-background hover:opacity-90 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-1.5"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started <Check className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Next Step <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
