import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message ?? '' }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', err, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen bg-[#060d16] flex items-center justify-center px-8">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center mx-auto">
            <span className="font-serif text-[#c9a96e] text-2xl">✦</span>
          </div>
          <div className="space-y-2">
            <p className="font-serif text-[#c9a96e] text-lg">Ada gangguan sebentar.</p>
            <p className="text-[#8a7a65] text-sm leading-relaxed">
              Sila muat semula halaman untuk meneruskan perjalanan rohani anda.
            </p>
          </div>
          <div className="bg-[#060d16] border border-[#c9a96e15] rounded-xl p-3">
            <p className="font-serif text-[#c9a96e] text-sm leading-loose" dir="rtl">
              أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
            </p>
            <p className="text-[#8a7a65] text-xs mt-1 italic">
              "Ketahuilah, hanya dengan mengingati Allah hati menjadi tenang"
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3.5 bg-[#c9a96e] text-[#060d16] font-semibold rounded-xl text-sm hover:bg-[#e2c89a] transition-colors"
          >
            Cuba Semula
          </button>
        </div>
      </div>
    )
  }
}
