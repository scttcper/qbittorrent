// typedoc does not support typescript 7 yet, point its typescript imports at typescript 6
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'typescript') {
      return nextResolve('typescript6', { ...context, parentURL: import.meta.url });
    }
    return nextResolve(specifier, context);
  },
});
