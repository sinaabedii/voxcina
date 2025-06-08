import { FC } from 'react';
import { Share2, Copy, Twitter, Instagram, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { BsTelegram } from 'react-icons/bs';

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
          <BsTelegram className="w-4 h-4" />
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