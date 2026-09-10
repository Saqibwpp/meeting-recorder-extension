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
    <aside className="w-64 border-r border-[#e5e3d9] bg-white hidden md:block shrink-0 h-full overflow-y-auto">
      <nav className="p-4 space-y-1">
        {navItems.map(item => (
          <Link 
            key={item.href} 
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
              pathname.startsWith(item.href) ? 'bg-[#f0ede4] text-[#1a1a1a]' : 'text-[#666] hover:bg-gray-50 hover:text-[#1a1a1a]'
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
