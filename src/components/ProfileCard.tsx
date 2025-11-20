import { Heart, MessageCircle } from 'lucide-react';
import { Profile } from '../App';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProfileCardProps {
  profile: Profile;
  isLiked: boolean;
  onLike: () => void;
  onViewDetail?: () => void;
  onSelect?: () => void;
}

export function ProfileCard({ profile, isLiked, onLike, onViewDetail, onSelect }: ProfileCardProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect();
    } else if (onViewDetail) {
      onViewDetail();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden active:shadow-lg transition-shadow">
      {/* Image */}
      <div
        className="relative aspect-[3/4] cursor-pointer"
        onClick={handleClick}
      >
        <ImageWithFallback
          src={profile.image}
          alt={profile.name}
          className="w-full h-full object-cover"
        />
        {profile.isStudent && (
          <div className="absolute top-1.5 right-1.5 bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            学生
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2">
        {/* Basic Info */}
        <div
          className="mb-1.5 cursor-pointer"
          onClick={handleClick}
        >
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-gray-900">{profile.name}</span>
            <span className="text-[10px] text-gray-500">
              {profile.age} · {profile.location}
            </span>
          </div>
        </div>

        {/* Challenge Theme - EMPHASIZED */}
        <div
          className="mb-1.5 bg-gradient-to-r from-orange-50 to-yellow-50 p-1.5 rounded border border-orange-200 cursor-pointer"
          onClick={handleClick}
        >
          <div className="flex items-start gap-1">
            <span className="text-xs flex-shrink-0">🔥</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-orange-800 line-clamp-2 break-words">
                {profile.challengeTheme}
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div
          className="mb-2 cursor-pointer"
          onClick={handleClick}
        >
          <div className="flex items-center gap-0.5 mb-1">
            <span className="text-xs">💪</span>
            <span className="text-[9px] text-gray-600">スキル</span>
          </div>
          <div className="flex flex-wrap gap-0.5">
            {profile.skills.slice(0, 2).map((skill, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 text-[9px] px-1 py-0.5 rounded"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
            className={`flex-1 flex items-center justify-center gap-0.5 py-1.5 rounded-lg transition-all active:scale-95 ${
              isLiked
                ? 'bg-pink-500 text-white active:bg-pink-600'
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`}
            />
            <span className="text-[10px]">いいね</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className="p-1.5 bg-gradient-to-r from-teal-600 to-blue-600 active:opacity-80 text-white rounded-lg transition-all active:scale-95"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}