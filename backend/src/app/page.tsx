import Link from 'next/link';
import { InstallModal } from '@/components/home/InstallModal';
import { Button } from '@/components/ui/Button';

const capabilities = [
  {
    number: "01",
    title: "Automatic recording",
    description: "Capture tab audio and your microphone together, without a bot joining the call.",
  },
  {
    number: "02",
    title: "Structured transcripts",
    description: "Turn every conversation into speaker-labelled text, concise summaries, and clear action items.",
  },
  {
    number: "03",
    title: "MCP connectivity",
    description: "Bring meeting context directly into Cursor, Claude Desktop, or your own agents through MCP.",
  },
];

const workflow = [
  ["01", "Install", "Add the lightweight extension to your browser."],
  ["02", "Record", "Capture system audio and your microphone in one click."],
  ["03", "Transcribe", "Turn the conversation into structured text and summaries."],
  ["04", "Build", "Query your meeting context from your coding tools through MCP."],
];

function BrandMark() {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-primary font-mono text-xs font-medium text-primary-foreground">
      AI
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="#top" className="flex items-center gap-3" aria-label="Embrace AI home">
            <BrandMark />
            <span className="text-[15px] font-semibold">Embrace AI</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="Main navigation">
            <a className="transition-colors hover:text-foreground" href="#capabilities">Features</a>
            <a className="transition-colors hover:text-foreground" href="#workflow">How it works</a>
          </nav>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">Dashboard</Button>
          </Link>
        </div>
      </header>

      <section id="top" className="bg-background overflow-hidden relative">
        <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-16 md:px-8 lg:grid-cols-12 lg:items-center lg:py-24">
          <div className="lg:col-span-7">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Embrace AI / browser meeting recorder</p>
            <h1 className="mt-6 max-w-[18ch] text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl text-foreground">
              Meetings recorded. Intelligence captured.
            </h1>
            <p className="mt-6 max-w-[52ch] text-pretty text-lg leading-8 text-muted-foreground">
              The minimal browser extension that records your meetings, generates Gemini-powered transcripts, and connects to your AI coding agents through MCP.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <InstallModal />
              <Link href="/dashboard">
                <Button variant="outline" size="lg">Open dashboard</Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5" aria-label="Example meeting transcript">
            <div className="rounded-lg border border-border bg-surface/90 p-6 shadow-editorial">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Generated transcript</span>
                <span className="font-mono text-[10px] text-emerald-600 flex items-center gap-1">
                  ✓ Processed
                </span>
              </div>
              <div className="mt-6 space-y-4 font-mono text-xs leading-relaxed text-foreground/90">
                <p><span className="text-muted-foreground">00:04</span> — Maya: Let’s lock the Q3 launch date.</p>
                <p><span className="text-muted-foreground">00:11</span> — Dev: I’ll share the final checklist today.</p>
                <p><span className="text-muted-foreground">00:19</span> — Maya: Route the summary to our project board.</p>
              </div>
              <div className="mt-6 border-t border-border pt-5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Executive summary</p>
                <p className="mt-3 text-sm leading-6 text-foreground/90">Launch date confirmed. Final checklist due today; summary will be sent to the project board.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="border-y border-border bg-section-blush">
        <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-24">
          <div className="grid gap-6 md:grid-cols-3 md:gap-12">
            <div className="md:col-span-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Capabilities / 03</p>
              <h2 className="mt-4 max-w-[12ch] text-3xl font-semibold leading-tight tracking-tight">Everything you need. Nothing you don’t.</h2>
            </div>
            <p className="max-w-[48ch] text-base leading-relaxed text-muted-foreground md:col-span-2 md:justify-self-end md:mt-10">
              Designed for developers and teams who want meeting context structured, accessible, and ready for the tools they already use.
            </p>
          </div>
          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {capabilities.map((item) => (
              <article key={item.number} className="border-l border-border pl-6">
                <p className="font-mono text-[11px] text-muted-foreground">{item.number}</p>
                <h3 className="mt-5 text-xl font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-section-butter">
        <div className="mx-auto max-w-[1200px] px-5 py-20 md:px-8 md:py-24">
          <div className="grid gap-6 md:grid-cols-2 md:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Workflow / 04</p>
              <h2 className="mt-4 max-w-[15ch] text-4xl font-semibold leading-tight tracking-tight">From call to context, in four steps.</h2>
            </div>
          </div>
          <div className="mt-12">
            {workflow.map(([number, title, description]) => (
              <div key={number} className="grid gap-3 border-t border-border py-6 sm:grid-cols-[80px_180px_1fr] sm:items-center">
                <span className="font-mono text-lg text-muted-foreground">{number}</span>
                <h3 className="text-lg font-medium">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-lg border border-border bg-background/50 p-6 md:p-8">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Meeting pipeline</span>
              <span className="font-mono text-[10px] uppercase text-foreground flex items-center gap-1.5">
                Automated
              </span>
            </div>
            <div className="mt-6 h-2 overflow-hidden rounded-sm bg-border"><div className="h-full rounded-sm bg-foreground w-[65%]" /></div>
            <div className="mt-4 grid grid-cols-4 font-mono text-[9px] uppercase tracking-widest text-muted-foreground sm:text-[10px]">
              <span>record</span><span className="text-center sm:text-left">transcribe</span><span className="text-center sm:text-left">summarize</span><span className="text-right">connect</span>
            </div>
          </div>
        </div>
      </section>

      <footer id="download" className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-10 px-5 py-16 md:flex-row md:items-center md:px-8">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">Put your meetings to work.</p>
            <div className="mt-6 flex flex-wrap gap-4">
              <InstallModal />
              <Link href="/dashboard">
                <Button variant="outline">Open dashboard</Button>
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-4 text-left md:text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">© {new Date().getFullYear()} Embrace AI</p>
            <div className="flex gap-6 text-xs text-muted-foreground"><a href="#privacy" className="hover:text-foreground transition-colors">Privacy</a><a href="#terms" className="hover:text-foreground transition-colors">Terms</a></div>
          </div>
        </div>
      </footer>
    </main>
  );
}
