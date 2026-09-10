import React, { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div 
      className={`bg-surface border border-border rounded-lg shadow-editorial overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: CardProps) {
  return <div className={`px-6 py-4 border-b border-border ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`font-semibold text-lg text-foreground ${className}`} {...props}>{children}</h3>;
}

export function CardDescription({ className = '', children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-muted-foreground mt-1 ${className}`} {...props}>{children}</p>;
}

export function CardContent({ className = '', children, ...props }: CardProps) {
  return <div className={`p-6 ${className}`} {...props}>{children}</div>;
}

export function CardFooter({ className = '', children, ...props }: CardProps) {
  return <div className={`px-6 py-4 border-t border-border bg-background/50 ${className}`} {...props}>{children}</div>;
}
