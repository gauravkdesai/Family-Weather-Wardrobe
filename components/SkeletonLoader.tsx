import React from 'react';

const SkeletonLoader: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Weather Display Skeleton */}
      <div className="glass-panel rounded-2xl p-6 h-64 w-full relative overflow-hidden">
        <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-700/50"></div>
                <div className="space-y-2">
                    <div className="h-6 w-48 bg-slate-700/50 rounded"></div>
                    <div className="h-4 w-32 bg-slate-700/50 rounded"></div>
                </div>
            </div>
            <div className="text-right space-y-2">
                <div className="h-8 w-24 bg-slate-700/50 rounded ml-auto"></div>
            </div>
        </div>
        {/* Graph Line */}
        <div className="absolute bottom-6 left-6 right-6 h-32 bg-slate-700/20 rounded-xl"></div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-slate-700/50 rounded-full flex-shrink-0"></div>
        ))}
      </div>

      {/* Suggestion Card Skeleton */}
      <div className="glass-panel rounded-2xl p-6 h-64 w-full">
         <div className="space-y-4">
            <div className="h-6 w-3/4 bg-slate-700/50 rounded"></div>
            <div className="h-4 w-1/2 bg-slate-700/50 rounded"></div>
            <div className="h-4 w-5/6 bg-slate-700/50 rounded"></div>
            <div className="h-4 w-full bg-slate-700/50 rounded"></div>
         </div>
         <div className="mt-8 grid grid-cols-2 gap-4">
             <div className="h-20 bg-slate-700/30 rounded-xl"></div>
             <div className="h-20 bg-slate-700/30 rounded-xl"></div>
         </div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
