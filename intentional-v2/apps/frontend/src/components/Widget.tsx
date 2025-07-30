import React, { ReactNode } from 'react'
import './Widget.css'

interface WidgetProps {
  icon?: string
  title?: string
  children: ReactNode
  className?: string
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export const Widget: React.FC<WidgetProps> = ({
  icon,
  title,
  children,
  className = '',
  collapsed = false,
  onToggleCollapse
}) => {
  return (
    <div className={`widget ${className} ${collapsed ? 'collapsed' : ''}`}>
      {(icon || title) && (
        <div className="widget-header">
          <div className="widget-title">
            {icon && <span className="widget-icon">{icon}</span>}
            {title && <span>{title}</span>}
          </div>
          {onToggleCollapse && (
            <span className="collapse-toggle" onClick={onToggleCollapse}>
              {collapsed ? '›' : '‹'}
            </span>
          )}
        </div>
      )}
      <div className="widget-content">
        {children}
      </div>
    </div>
  )
}