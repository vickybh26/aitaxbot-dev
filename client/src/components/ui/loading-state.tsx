import React from "react";
import { Loader2, Calculator, TrendingUp } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  type?: "default" | "calculation" | "data";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingState({ 
  message = "Loading...", 
  type = "default",
  size = "md",
  className = "" 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  const getIcon = () => {
    switch (type) {
      case "calculation":
        return <Calculator className={`${sizeClasses[size]} animate-pulse`} />;
      case "data":
        return <TrendingUp className={`${sizeClasses[size]} animate-pulse`} />;
      default:
        return <Loader2 className={`${sizeClasses[size]} animate-spin`} />;
    }
  };

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`} data-testid="loading-state">
      {getIcon()}
      <span className="text-neutral-600 animate-pulse">{message}</span>
    </div>
  );
}

// Skeleton components for different content types
export function CalculatorSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4"></div>
      <div className="h-10 bg-neutral-200 rounded animate-pulse"></div>
      <div className="h-4 bg-neutral-200 rounded animate-pulse w-1/2"></div>
      <div className="h-10 bg-neutral-200 rounded animate-pulse"></div>
      <div className="h-12 bg-primary/20 rounded animate-pulse"></div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="w-16 h-16 bg-neutral-200 rounded-xl animate-pulse"></div>
      <div className="h-6 bg-neutral-200 rounded animate-pulse w-3/4"></div>
      <div className="h-4 bg-neutral-200 rounded animate-pulse"></div>
      <div className="h-4 bg-neutral-200 rounded animate-pulse w-2/3"></div>
      <div className="h-10 bg-neutral-200 rounded animate-pulse"></div>
    </div>
  );
}

export default LoadingState;