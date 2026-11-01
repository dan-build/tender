import { useEffect, useLayoutEffect } from 'react';

// useLayoutEffect measures before paint in the browser; on the server there
// is nothing to measure, and React 18 warns on every render that uses it.
export const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
