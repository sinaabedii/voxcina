import { useState } from 'react';
import { Search as MagnifyingGlassIcon } from 'lucide-react';

interface BlogSearchProps {
  onSearch: (searchTerm: string) => void;
}

export default function BlogSearch({ onSearch }: BlogSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 md:mb-8">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجو در مقالات..."
          className="w-full rounded-xl border border-gray-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 text-xs sm:text-sm shadow-soft focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300/20"
        />
        <button
          type="submit"
          className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-voxcina-blue"
        >
          <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      </div>
    </form>
  );
} 