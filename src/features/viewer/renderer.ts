import type { RendererKind } from '@/features/editor/store';

export interface Created {
  renderer: any;
  kind: RendererKind;
}

/** True when the browser exposes WebGPU and gives us an adapter. */
export async function hasWebGPU(): Promise<boolean> {
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
  if (!nav || !nav.gpu) return false;
  try {
    return (await nav.gpu.requestAdapter()) != null;
  } catch {
    return false;
  }
}

/**
 * The three.js WebGPU renderer, on the canvas the Canvas component made.
 * If it fails to start, the regular WebGL renderer takes the same canvas.
 * The WebGPU build of three is only loaded when this runs.
 */
export async function createWebGPURenderer(props: any): Promise<Created> {
  try {
    const { WebGPURenderer } = await import('three/webgpu');
    const renderer = new WebGPURenderer({ canvas: props.canvas, antialias: true });
    await renderer.init();
    return { renderer, kind: 'WebGPU' };
  } catch {
    const { WebGLRenderer } = await import('three');
    const renderer = new WebGLRenderer({ canvas: props.canvas, antialias: true });
    return { renderer, kind: 'WebGL' };
  }
}
