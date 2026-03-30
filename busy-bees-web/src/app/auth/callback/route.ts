import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') 
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      let response: NextResponse;
      
      if (isLocalEnv) {
        response = NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        response = NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        response = NextResponse.redirect(`${origin}${next}`)
      }
      
      // CRITICAL NEXT.JS FIX: NextResponse.redirect creates a fresh Response object
      // that loses the cookies set by exchangeCodeForSession implicitly. 
      // We MUST manually attach the cookieStore back to the outgoing redirect response!
      (await cookies()).getAll().forEach((cookie: any) => {
        response.cookies.set(cookie.name, cookie.value, cookie)
      });
      
      return response;
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-code-exchange`)
}
