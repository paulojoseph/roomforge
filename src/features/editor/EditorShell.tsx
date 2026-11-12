'use client';

import dynamic from 'next/dynamic';
import Editor2D from './Editor2D';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';

// three.js needs the browser, keep it out of the server render
const Viewer3D = dynamic(() => import('@/features/viewer/Viewer3D'), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-neutral-500">Loading 3D view</div>,
});

export default function EditorShell() {
  return (
    <div className="flex h-full flex-col">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <div className="grid min-w-0 flex-1 grid-cols-2 divide-x divide-neutral-300">
          <div className="relative min-w-0">
            <Editor2D />
          </div>
          <div className="relative min-w-0 bg-neutral-100">
            <Viewer3D />
          </div>
        </div>
        <Sidebar />
      </div>
    </div>
  );
}
