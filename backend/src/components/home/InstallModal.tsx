'use client';

import { useState } from 'react';
import { Download, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function InstallModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        size="lg"
        className="flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        Download extension
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl w-full max-w-md overflow-hidden shadow-editorial border border-border animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-background/50">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Install Embrace
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-foreground text-sm leading-relaxed">
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-foreground shadow-soft">
                <strong>Coming soon to the Chrome Web Store!</strong> For now, you can install the beta directly from the source ZIP.
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-bold text-foreground">1</div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Download the ZIP</h4>
                    <p className="text-muted-foreground text-xs mb-2">Extract the provided ZIP file to a folder on your computer.</p>
                    <a href="/embrace-extension.zip" download>
                      <Button size="sm" className="flex items-center gap-2" variant="outline">
                        <Download className="w-3 h-3" />
                        Download ZIP
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-bold text-foreground">2</div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Enable Developer Mode</h4>
                    <p className="text-muted-foreground text-xs">Go to <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[10px]">chrome://extensions</code> and toggle &quot;Developer mode&quot; on.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-bold text-foreground">3</div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">Load Unpacked</h4>
                    <p className="text-muted-foreground text-xs">Click <strong>Load unpacked</strong> and select the extracted folder.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-background/50 flex justify-end">
              <Button onClick={() => setIsOpen(false)} variant="secondary">
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
