import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../contexts/AuthContext"

export default function AuthCallback() {
  const nav = useNavigate()
  const { setShowLoginDialog, setShowRegisterDialog, setPrefillEmail } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get("token_hash") || undefined
    const type = params.get("type") || undefined
    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''))
    const accessToken = hashParams.get('access_token') || undefined
    const refreshToken = hashParams.get('refresh_token') || undefined
    const handle = async () => {
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        nav("/", { replace: true })
        return
      }
      if (tokenHash) {
        await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash })
        nav("/", { replace: true })
        return
      }
      if (type === "signup") {
        try {
          const re = localStorage.getItem("dado.auth.registrationEmail") || undefined
          localStorage.setItem("dado.auth.registrationFlow", "true")
          setPrefillEmail(re)
        } catch {}
        setShowRegisterDialog(false)
        setShowLoginDialog(true)
        nav("/", { replace: true })
        return
      }
      nav("/", { replace: true })
    }
    handle()
  }, [nav, setShowLoginDialog, setShowRegisterDialog, setPrefillEmail])

  return (
    <div className="p-6 text-center text-sm text-neutral-600">处理中...</div>
  )
}