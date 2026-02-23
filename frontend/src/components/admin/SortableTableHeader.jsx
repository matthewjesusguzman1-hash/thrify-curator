import { ArrowUpDown } from "lucide-react";

export default function SortableTableHeader({
  label,
  sortKey,
  currentSortKey,
  currentDirection,
  onSort,
  className = ""
}) {
  const isActive = currentSortKey === sortKey;
  
  return (
    <th 
      className={`cursor-pointer hover:bg-[#F9F6F7] transition-colors select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <ArrowUpDown className={`w-3 h-3 ${isActive ? 'text-[#C5A065]' : 'text-[#aaa]'}`} />
        {isActive && (
          <span className="text-xs text-[#C5A065]">
            {currentDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );
}
