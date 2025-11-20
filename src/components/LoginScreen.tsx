export function LoginScreen({ onCreateAccount, onLogin }: { onCreateAccount: () => void; onLogin: () => void }) {
  return (
    <div className="min-h-screen relative flex flex-col bg-gray-900">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1563457025576-c949c4e3da06?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMGVudHJlcHJlbmV1cnMlMjBjb2xsYWJvcmF0aW9uJTIwbWVldGluZ3xlbnwxfHx8fDE3NjM1MzExMTN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Young entrepreneurs collaborating"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen px-6 py-8">
        {/* Logo */}
        <div className="flex-shrink-0 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center text-[rgb(60,189,240)]">
              <span className="text-white text-xl">B</span>
            </div>
            <span className="text-white text-2xl font-[ADLaM_Display]">BizYou</span>
          </div>
        </div>

        {/* Main Message */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-white text-4xl mb-4 px-4">
              あなたの挑戦の<br />相棒を見つけよう
            </h1>
            <p className="text-white/80 text-lg px-6">
              25歳以下の起業・ビジコン・スモビジに<br />挑戦する仲間と出会う
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 space-y-3 pb-6">
          {/* Create Account Button - Primary */}
          <button
            onClick={onCreateAccount}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-4 rounded-full transition-transform active:scale-95 shadow-lg"
          >
            <span className="text-lg">アカウントを作成</span>
          </button>

          {/* Login Button - Secondary */}
          <button
            onClick={onLogin}
            className="w-full bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white py-4 rounded-full transition-transform active:scale-95"
          >
            <span className="text-lg">アカウントをお持ちの方</span>
          </button>

          {/* Terms */}
          <div className="text-center pt-2">
            <p className="text-white/60 text-xs leading-relaxed px-4">
              続行することで、
              <a href="#" className="text-white/90 underline">利用規約</a>
              および
              <a href="#" className="text-white/90 underline">プライバシーポリシー</a>
              に同意したものとみなされます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
