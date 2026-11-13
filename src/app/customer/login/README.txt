Replace only src/app/customer/login/page.tsx.
Change: render existing critical login CSS as a native style element instead of styled-jsx, so styles are available immediately on first paint.
No auth, OTP, layout, or subscription logic was changed from the last supplied login patch.
Test with a hard reload and restart Next dev server if needed.
