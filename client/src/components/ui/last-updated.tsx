import React from "react";
import { Clock, CheckCircle, TrendingUp } from "lucide-react";

interface LastUpdatedProps {
  date: string | Date;
  type?: "content" | "data" | "rates";
  className?: string;
  showIcon?: boolean;
}

export function LastUpdated({ 
  date, 
  type = "content",
  className = "",
  showIcon = true 
}: LastUpdatedProps) {
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeInfo = () => {
    switch (type) {
      case "data":
        return {
          label: "Data updated",
          icon: <TrendingUp className="w-3 h-3" />,
          color: "text-blue-600"
        };
      case "rates":
        return {
          label: "Tax rates updated",
          icon: <CheckCircle className="w-3 h-3" />,
          color: "text-green-600"
        };
      default:
        return {
          label: "Last updated",
          icon: <Clock className="w-3 h-3" />,
          color: "text-neutral-500"
        };
    }
  };

  const typeInfo = getTypeInfo();

  return (
    <div 
      className={`flex items-center space-x-1 text-xs ${typeInfo.color} ${className}`}
      data-testid={`last-updated-${type}`}
    >
      {showIcon && typeInfo.icon}
      <span>
        {typeInfo.label}: {formatDate(date)}
      </span>
    </div>
  );
}

export default LastUpdated;