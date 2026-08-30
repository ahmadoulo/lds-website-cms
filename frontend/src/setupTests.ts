import { configure } from '@testing-library/react';
import '@testing-library/jest-dom';

// findBy* defaults to one second, which a machine running the type-checker and
// the linter at the same time can exceed. The extra headroom removes a flake
// without hiding a genuinely slow render.
configure({ asyncUtilTimeout: 5000 });
