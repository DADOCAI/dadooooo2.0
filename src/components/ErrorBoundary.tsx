import { Component, ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: any, info: any) { console.error('app error', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="sm:max-w-[425px] bg-white border border-blue-500 rounded-none shadow-none p-8 text-center">
            <div className="text-red-500 text-2xl mb-3">!</div>
            <p className="text-sm text-black">服务不可用，请刷新或稍后重试</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}