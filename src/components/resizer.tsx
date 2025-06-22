import { GripVertical } from 'lucide-react';

interface ResizerProps {
  direction: 'horizontal' | 'vertical';
  onMouseDown: (e: React.MouseEvent) => void;
}

export default function Resizer({ direction, onMouseDown }: ResizerProps) {
  const isHorizontal = direction === 'horizontal';
  
  return (
    <div
      className={`
        ${isHorizontal ? 'w-2 cursor-ew-resize' : 'h-2 cursor-ns-resize'}
        bg-gray-300 dark:bg-gray-600 
        hover:bg-blue-500 dark:hover:bg-blue-400 
        flex items-center justify-center 
        transition-colors select-none
      `}
      onMouseDown={onMouseDown}
      title={`Drag to resize ${isHorizontal ? 'panels' : 'video and properties'}`}
    >
      {isHorizontal ? (
        <GripVertical className="w-3 h-3 text-gray-500 dark:text-gray-400 pointer-events-none" />
      ) : (
        <div className="w-8 h-0.5 bg-gray-500 dark:bg-gray-400 rounded pointer-events-none"></div>
      )}
    </div>
  );
} 