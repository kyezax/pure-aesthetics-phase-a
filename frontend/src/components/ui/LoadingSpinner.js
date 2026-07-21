import React from "react";

const LoadingSpinner = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
    xl: "w-12 h-12 border-4"
  };

  return (
    <div className={`
      ${sizeClasses[size]} 
      border-gray-300 border-t-purple-600 
      rounded-full animate-spin 
      ${className}
    `} />
  );
};

export default LoadingSpinner;