import { useState } from 'react';
import { Search as MagnifyingGlassIcon } from 'lucide-react';

interface BlogSearchProps {
  onSearch: (searchTerm: string) => void;
  initialValue?: string;
}

export default function BlogSearch({ onSearch, initialValue = '' }: BlogSearchProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجو در مقالات..."
          className="w-full rounded-full border border-transparent bg-white px-5 py-3 pl-12 text-sm shadow-soft transition-all duration-200 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300/30 sm:px-6 sm:py-3.5 sm:pl-14 sm:text-base"
        />
        <button
          type="submit"
          aria-label="جستجو"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full p-2 text-gray-400 transition-colors hover:bg-secondary-200 hover:text-voxcina-blue sm:left-3.5"
        >
          <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
    </form>
  );
}
