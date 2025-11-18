import React from 'react'

export default function LocalModelInitDialog({ visible, stage, progress, errorMessage }: { visible: boolean, stage?: string, progress?: number, errorMessage?: string }) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border-2 border-black rounded-xl p-6 w-[360px]">
        <div className="text-lg font-semibold mb-3">AI 本地模型初始化中</div>
        <div className="text-sm text-gray-700">
          <div className="mb-2">首次使用需要下载模型，大约 15-45 秒，请耐心等待...</div>
          <div className="mb-1">{stage === 'downloading' ? '正在下载模型...' : stage === 'loading' ? '正在加载模型...' : stage === 'ready' ? '模型已就绪' : errorMessage ? errorMessage : ''}</div>
          {typeof progress === 'number' ? (<div className="w-full h-2 bg-gray-200 rounded overflow-hidden"><div className="h-2 bg-black" style={{ width: `${Math.round(progress * 100)}%` }} /></div>) : null}
        </div>
      </div>
    </div>
  )
}