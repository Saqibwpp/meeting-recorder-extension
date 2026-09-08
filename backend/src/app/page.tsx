import React from 'react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#fdfcf9] text-[#2d2d2d] font-sans selection:bg-[#e5e3d9] selection:text-[#1a1a1a]">
      {/* Navbar */}
      <nav className="w-full max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2d2d2d] flex items-center justify-center">
            <span className="text-white text-sm font-semibold">AI</span>
          </div>
          <span className="text-lg font-medium tracking-tight text-[#1a1a1a]">Embrace AI</span>
        </div>
        <div className="flex items-center gap-6 text-[13px] text-[#555]">
          <a href="#" className="hover:text-[#1a1a1a] transition-colors">Features</a>
          <a href="#" className="hover:text-[#1a1a1a] transition-colors">Privacy</a>
          <a href="#" className="hover:text-[#1a1a1a] transition-colors">Install</a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-32">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1a1a1a] max-w-2xl mb-6">
          Capture every detail with precision.
        </h1>
        <p className="text-[#555] text-lg sm:text-xl max-w-xl leading-relaxed mb-10">
          The minimalist AI notetaker extension. Record your meetings, transcribe seamlessly with Gemini, and never miss a decision again.
        </p>
        
        <div className="flex items-center gap-4">
          <a 
            href="#"
            className="py-3 px-6 bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white rounded-[6px] text-[14px] font-medium transition-colors shadow-sm"
          >
            Add to Chrome
          </a>
          <a 
            href="#"
            className="py-3 px-6 bg-white hover:bg-gray-50 text-[#1a1a1a] rounded-[6px] text-[14px] font-medium border border-[#e5e3d9] transition-colors shadow-sm"
          >
            View Dashboard
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-10 text-[12px] text-[#aaa] border-t border-[#e5e3d9]">
        &copy; {new Date().getFullYear()} Embrace AI Notetaker. All rights reserved.
      </footer>
    </div>
  );
}
