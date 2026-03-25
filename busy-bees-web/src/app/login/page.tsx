'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import styles from './login.module.css'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'An error occurred during login')
    } finally {
      // Note: We don't typically set loading to false here because
      // the page will redirect away on success.
    }
  }

  return (
    <div className={styles.container}>
      {/* Left pane - Decorative / Branding */}
      <div className={styles.leftPane}>
        {/* Background Decorative Elements */}
        <div className={styles.decorTop} />
        <div className={styles.decorBottom} />
        
        <div className={styles.logoContainer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={styles.logoText}>
              Busy<span className={styles.logoAccent}>Bees</span>
            </span>
            <span className={styles.logoBadge}>
              LBA
            </span>
          </div>
        </div>
        
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Streamline your autism therapy workflows.
          </h1>
          <p className={styles.heroDesc}>
            The all-in-one platform for BCBAs and RBTs. Manage clients, track data, and generate reports with ease and precision.
          </p>
        </div>
        
        <div className={styles.footerLinks}>
          <span>© 2026 Busy Bees LBA</span>
          <span>•</span>
          <a href="#" className={styles.footerLink}>Privacy Policy</a>
          <span>•</span>
          <a href="#" className={styles.footerLink}>Terms of Service</a>
        </div>
      </div>

      {/* Right pane - Login Form */}
      <div className={styles.rightPane}>
        <div className={styles.formContainer}>
          
          {/* Mobile Logo (hidden on large screens) */}
          <div className={styles.mobileLogo}>
            <span className={styles.logoText}>
              Busy<span className={styles.logoAccent}>Bees</span>
            </span>
          </div>

          <div className={styles.welcomeText}>
            <h2 className={styles.welcomeTitle}>Welcome back</h2>
            <p className={styles.welcomeDesc}>
              Sign in to your account to continue
            </p>
          </div>

          <div>
            {error && (
              <div className={styles.errorBanner}>
                <svg className={styles.errorIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <button
              id="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
              className={styles.googleBtn}
            >
              {loading ? (
                <div className={styles.spinner} />
              ) : (
                <svg className={styles.gIcon} viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
              )}
              {loading ? 'Connecting...' : 'Continue with Google'}
            </button>

            <div className={styles.disclaimer}>
              By continuing, you acknowledge that you are a staff member of Busy Bees Therapy and this system contains protected health information (PHI). 
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
