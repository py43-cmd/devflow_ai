const AuthLayout = ({ title, subtitle, children, footer }) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(140%_140%_at_50%_0%,rgba(99,102,241,0.22),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_90%_at_15%_85%,rgba(139,92,246,0.18),transparent_75%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_80%_at_85%_15%,rgba(34,211,238,0.14),transparent_80%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/55 to-transparent" />
        <div className="absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]">
          <div className="absolute inset-0 animate-[grid-move_36s_linear_infinite] bg-[linear-gradient(to_right,rgba(99,102,241,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.14)_1px,transparent_1px)] bg-[size:70px_70px]" />
          <div className="absolute inset-0 animate-[grid-move_48s_linear_infinite_reverse] bg-[linear-gradient(to_right,rgba(139,92,246,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.1)_1px,transparent_1px)] bg-[size:90px_90px] mix-blend-screen" />
        </div>
        <div className="absolute -top-[340px] left-1/2 h-[680px] w-[680px] -translate-x-1/2 animate-[pulse-slow_14s_ease-in-out_infinite] rounded-full bg-[conic-gradient(from_200deg_at_50%_50%,rgba(99,102,241,0),rgba(99,102,241,0.45),rgba(139,92,246,0.3),rgba(34,211,238,0.22),rgba(99,102,241,0))] opacity-75 blur-[130px]" />
        <div className="absolute -bottom-[300px] left-1/2 h-[600px] w-[600px] -translate-x-1/2 animate-[pulse-slow_18s_ease-in-out_infinite_reverse] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.26),transparent_68%)] blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 animate-[pulse-slow_20s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.16),transparent_72%)] blur-[120px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mb-6 inline-flex items-center justify-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-500 shadow-[0_0_0_4px_rgba(99,102,241,0.18),0_20px_60px_-30px_rgba(99,102,241,0.9)]">
              <span className="text-base font-bold tracking-wide text-white">DF</span>
              <span className="absolute inset-0 rounded-2xl animate-[spin-slow_18s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent,rgba(255,255,255,0.25),transparent_70%)] mix-blend-lighten" />
              <span className="absolute inset-0 rounded-2xl ring-1 ring-white/25" />
            </div>
            <div className="text-left">
              <p className="text-lg font-semibold tracking-tight text-zinc-50">DevFlow AI</p>
              <p className="text-[10px] uppercase tracking-[0.4em] text-indigo-200/80">
                Intelligent Workspace
              </p>
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-zinc-300">{subtitle}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-[0_60px_160px_-100px_rgba(99,102,241,1)] backdrop-blur-2xl sm:p-8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
          <div className="absolute -top-16 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[90px]" />
          {children}
        </div>

        {footer ? (
          <p className="mt-6 text-center text-sm text-zinc-400">{footer}</p>
        ) : null}
      </div>
    </div>
  );
};

export default AuthLayout;