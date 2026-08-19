import React from 'react';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
};

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  max = 5,
  size = 'md',
  readOnly = false,
}) => {
  const handleMouseOver = (e: React.MouseEvent<HTMLButtonElement>, star: number) => {
    if (readOnly) return;
    // Preview hover effect: update the DOM star color (handled via CSS sibling)
    const buttons = e.currentTarget.parentElement?.querySelectorAll('button[name="star"]') || [];
    buttons.forEach((btn, i) => {
      const btnStar = i + 1;
      if (btnStar <= star) {
        btn.classList.add('text-yellow-400');
      } else if (btnStar > star && btnStar > value) {
        btn.classList.remove('text-yellow-400');
      }
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (readOnly) return;
    const buttons = e.currentTarget.parentElement?.querySelectorAll('button[name="star"]') || [];
    buttons.forEach((btn, i) => {
      const btnStar = i + 1;
      btn.classList.toggle('text-yellow-400', btnStar <= value);
    });
  };

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1;
        const filled = value >= star;
        const half = value >= star - 0.5 && value < star;

        return (
          <button
            key={star}
            type="button"
            name="star"
            disabled={readOnly}
            onClick={() => !readOnly && onChange(star)}
            onMouseEnter={(e) => handleMouseOver(e, star)}
            onMouseLeave={handleMouseLeave}
            className={`transition-all duration-150 ${sizeClasses[size]} ${
              filled || half
                ? 'text-yellow-400'
                : 'text-gray-600 hover:text-yellow-300'
            }`}
            aria-label={`Rate ${star} out of ${max}`}
          >
            {half ? (
              <HalfStar />
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
};

// Half star for 0.5 increments
const HalfStar: React.FC = () => (
  <div className="relative">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-full h-full">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="currentColor"
      />
    </svg>
    <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400 w-full h-full">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </div>
  </div>
);
