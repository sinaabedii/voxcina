import { FC } from 'react';
import { Share2, Copy, Twitter, Instagram, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-toastify';

/**
 * Telegram's brand mark, inlined from Bootstrap Icons (the former
 * `react-icons/bs` import). lucide-react ships no brand logos, and the
 * generic paper plane is a different mark — this keeps the button exactly
 * as it rendered before while dropping the react-icons dependency.
 */
const TelegramIcon: FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.287 5.906q-1.168.486-4.666 2.01-.567.225-.595.442c-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294q.39.01.868-.32 3.269-2.206 3.374-2.23c.05-.012.12-.026.166.016s.042.12.037.141c-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8 8 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629q.14.092.27.187c.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.4 1.4 0 0 0-.013-.315.34.34 0 0 0-.114-.217.53.53 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09" />
  </svg>
);

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
}

/**
 * کامپوننت اشتراک‌گذاری در شبکه‌های اجتماعی با پشتیبانی از Open Graph
 */
const SocialShare: FC<SocialShareProps> = ({
  url,
  title,
  description,
  imageUrl,
}) => {
  // تضمین آدرس کامل
  const fullUrl = url.startsWith('http') ? url : `https://voxcina.com${url}`;
  
  // کپی لینک به کلیپ‌بورد
  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl)
      .then(() => toast.success('لینک کپی شد'))
      .catch(() => toast.error('خطا در کپی لینک'));
  };

  // اشتراک‌گذاری در توییتر
  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  // اشتراک‌گذاری در تلگرام
  const shareOnTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(title)}`;
    window.open(telegramUrl, '_blank');
  };

  // اشتراک‌گذاری در واتس‌اپ
  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${fullUrl}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-2 space-x-reverse mb-2">
        <Share2 className="w-5 h-5 text-voxcina-blue" />
        <h3 className="text-lg font-medium text-voxcina-blue">اشتراک‌گذاری</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-colors"
          aria-label="کپی لینک"
        >
          <Copy className="w-4 h-4" />
          <span className="text-sm">کپی لینک</span>
        </button>
        
        <button
          onClick={shareOnTwitter}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1DA1F2] hover:bg-[#1a94df] text-white transition-colors"
          aria-label="اشتراک در توییتر"
        >
          <Twitter className="w-4 h-4" />
          <span className="text-sm">توییتر</span>
        </button>
        
        <button
          onClick={shareOnTelegram}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0088cc] hover:bg-[#0077b3] text-white transition-colors"
          aria-label="اشتراک در تلگرام"
        >
          <TelegramIcon className="w-4 h-4" />
          <span className="text-sm">تلگرام</span>
        </button>
        
        <button
          onClick={shareOnWhatsApp}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white transition-colors"
          aria-label="اشتراک در واتساپ"
        >
          <LinkIcon className="w-4 h-4" />
          <span className="text-sm">واتساپ</span>
        </button>
      </div>
    </div>
  );
};

export default SocialShare; 