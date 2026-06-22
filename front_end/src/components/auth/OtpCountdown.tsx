"use client";

interface OtpCountdownProps {
  countdown: number;
  canResend: boolean;
  isLoading: boolean;
  onResend: () => void;
}

// Format countdown as MM:SS
const formatCountdown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function OtpCountdown({
  countdown,
  canResend,
  isLoading,
  onResend,
}: OtpCountdownProps) {
  return (
    <div className="flex justify-between items-center mt-4">
      {countdown > 0 ? (
        <span className="text-sm text-gray-400">
          ارسال مجدد تا{" "}
          <span className="font-medium text-gray-600">
            {formatCountdown(countdown)}
          </span>
        </span>
      ) : (
        <span className="text-sm text-gray-400">کد را دریافت نکردید؟</span>
      )}
      <button
        type="button"
        onClick={onResend}
        disabled={!canResend || isLoading}
        className={`text-sm font-medium transition-colors ${
          canResend 
            ? 'text-voxcina-blue hover:underline' 
            : 'text-gray-300 cursor-not-allowed'
        }`}
      >
        ارسال مجدد
      </button>
    </div>
  );
}

export { formatCountdown };
