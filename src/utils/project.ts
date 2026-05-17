import type { Slide } from '../types';

export interface ProjectFile {
  version: 1;
  appName: 'carousel-studio';
  exportedAt: number;
  slides: Slide[];
}

export function exportProjectFile(slides: Slide[]): Blob {
  const data: ProjectFile = {
    version: 1,
    appName: 'carousel-studio',
    exportedAt: Date.now(),
    slides,
  };
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

export async function importProjectFile(file: File): Promise<Slide[]> {
  const text = await file.text();
  const parsed = JSON.parse(text) as ProjectFile;
  if (parsed.appName !== 'carousel-studio' || !Array.isArray(parsed.slides)) {
    throw new Error('Invalid project file');
  }
  return parsed.slides;
}
