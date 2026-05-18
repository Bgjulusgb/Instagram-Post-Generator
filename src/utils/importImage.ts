import { createImageElement, useEditor } from '../store/editorStore';
import { toast } from '../hooks/useToast';
import { processImageFile } from './imagePreview';

/**
 * Unified entry point for importing an image as an element.
 *
 * Wraps the heavy work (decode → downsample → encode) in a toast lifecycle
 * so the user sees real-time feedback for big photos, then adds an element
 * to the active slide. Returns the element id for follow-up actions.
 */
export async function importImageFile(file: File): Promise<string | null> {
  const slide = useEditor.getState().slides.find(
    (s) => s.id === useEditor.getState().currentSlideId,
  );
  if (!slide) return null;

  const isLarge = file.size > 2_500_000;
  const toastId = isLarge
    ? toast.loading('Processing image…', humanSize(file.size))
    : null;

  try {
    const processed = await processImageFile(file);
    const el = createImageElement(
      {
        src: processed.src,
        previewSrc: processed.previewSrc,
        naturalWidth: processed.naturalWidth,
        naturalHeight: processed.naturalHeight,
      },
      slide.width,
      slide.height,
    );
    useEditor.getState().addElement(el);

    if (toastId !== null) {
      const saved =
        processed.originalBytes > processed.sourceBytes
          ? `Optimised ${humanSize(processed.originalBytes)} → ${humanSize(processed.sourceBytes)}`
          : `${humanSize(processed.sourceBytes)} kept full-resolution`;
      toast.update(toastId, {
        tone: 'success',
        title: 'Image added',
        message: saved,
        duration: 2400,
      });
    }
    return el.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (toastId !== null) {
      toast.update(toastId, {
        tone: 'error',
        title: "Couldn't import image",
        message,
        duration: 5000,
      });
    } else {
      toast.error("Couldn't import image", message);
    }
    return null;
  }
}

export async function importImageFiles(files: File[] | FileList): Promise<string[]> {
  const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
  const ids: string[] = [];
  // Sequential rather than parallel — keeps memory pressure low for large
  // photos and lets the toast stream feel responsive.
  for (const file of list) {
    const id = await importImageFile(file);
    if (id) ids.push(id);
  }
  return ids;
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
