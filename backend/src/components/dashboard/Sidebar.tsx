'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Folder, Zap } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  
  const navItems = [
    { label: 'Meetings', href: '/dashboard/meetings', icon: <Folder className="w-4 h-4" /> },
    { label: 'Developer & MCP', href: '/dashboard/developer', icon: <Zap className="w-4 h-4" /> }
  ];

  return (
    <aside className="w-64 border-r border-border bg-surface hidden md:block shrink-0 h-full overflow-y-auto">
      <nav className="p-4 space-y-1.5">
        <p className="px-3 mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Workspace</p>
        {navItems.map(item => (
          <Link 
            key={item.href} 
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname.startsWith(item.href) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
