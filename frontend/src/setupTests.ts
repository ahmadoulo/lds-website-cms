import { configure } from '@testing-library/react';
import '@testing-library/jest-dom';

// findBy* defaults to one second, which a machine running the type-checker and
// the linter at the same time can exceed. Three seconds removes that flake while
// staying under the 5s per-test timeout, so a query that never resolves still
// reports what it could not find rather than a bare timeout.
configure({ asyncUtilTimeout: 3000 });
