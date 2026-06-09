The R@lly wordmark is split into separate `<span>` elements in `SplashScreen.tsx` (and potentially elsewhere). Whitespace/newlines between these inline spans are rendered by the browser as actual text spaces, creating a visible gap between "R", "@", and "lly".

Plan:
1. Identify all components that render "R@lly" using split `<span>` elements.
2. Remove inter-span whitespace (newlines/indentation) so the browser does not insert text nodes between the characters.
3. Verify the fix renders the wordmark as a single continuous word in the preview.