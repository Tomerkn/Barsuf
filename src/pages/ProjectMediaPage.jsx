import React from 'react';
import { useParams } from 'react-router-dom';
import { ProjectMedia } from '../components/ui/ProjectMedia';
import { AIFloatingWidget } from '../components/ui/AIFloatingWidget';

export function ProjectMediaPage() {
  const { projectId } = useParams();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">מסמכים וגלריה</h1>
        <p className="text-text-secondary text-sm">ניהול קבצים ותמונות של הפרויקט</p>
      </div>
      <ProjectMedia projectId={projectId} />
      {/* Floating AI Widget on the media page as well for context queries */}
      <AIFloatingWidget projectId={projectId} />
    </div>
  );
}
