import React from 'react';
import { useParams } from 'react-router-dom';
import { ProjectGantt } from '../components/ui/ProjectGantt';

export function ProjectGanttPage() {
  const { projectId } = useParams();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ProjectGantt projectId={projectId} />
    </div>
  );
}
