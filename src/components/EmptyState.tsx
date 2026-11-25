"use client";

import React from "react";
import { SearchX } from "lucide-react";

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="empty-state-premium">
      <SearchX size={32} />
      <p>{message}</p>
    </div>
  );
}
