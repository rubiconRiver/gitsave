import React, { ReactNode } from 'react'
import './WidgetBar.css'

interface WidgetBarProps {
  children: ReactNode
}

export const WidgetBar: React.FC<WidgetBarProps> = ({ children }) => {
  return (
    <div className="widget-bar">
      {children}
    </div>
  )
}