import React, { ReactNode } from 'react'

export interface TopBarProps {
  title: string
  context?: string
  actions?: ReactNode
}

export const TopBar: React.FC<TopBarProps> = ({ title, context, actions }) => {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-md pt-[32px]">
      <div className="flex h-16 items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <p className="font-display text-[15px] font-semibold text-foreground">{title}</p>
          {context && (
            <>
              <span className="text-[13px] text-subtle">/</span>
              <p className="text-[13px] text-muted-foreground">{context}</p>
            </>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
