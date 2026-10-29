/**
 * Test Suite: Route Guard & Role Separation (Sub-task 2.2.2)
 * Chạy với Node: node web_doctor/scripts/test_route_guard.mjs
 */

import assert from 'node:assert';

// Mô phỏng logic getRouteAccessDecision từ src/components/ProtectedRoute.tsx
function getRouteAccessDecision({
  isAuthenticated,
  userRole,
  allowedRoles,
  currentPath,
  redirectPath,
}) {
  if (!isAuthenticated || !userRole) {
    return {
      status: 'redirect',
      target: '/login',
      preserveLocation: true,
    };
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const isAuthorized = allowedRoles.includes(userRole);

    if (!isAuthorized) {
      let fallbackTarget = redirectPath;

      if (!fallbackTarget) {
        if (userRole === 'doctor') {
          fallbackTarget = '/';
        } else if (userRole === 'admin') {
          fallbackTarget = '/admin';
        } else {
          fallbackTarget = '/unauthorized';
        }
      }

      if (fallbackTarget === currentPath) {
        return { status: 'redirect', target: '/unauthorized' };
      }

      return { status: 'redirect', target: fallbackTarget };
    }
  }

  return { status: 'authorized' };
}

console.log('------------------------------------------------------------');
console.log('RUNNING UNIT TESTS FOR SUB-TASK 2.2.2: PRIVATE ROUTE GUARD');
console.log('------------------------------------------------------------\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`[PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${testName}`);
    console.error(`       Error: ${err.message}`);
  }
}

// 1. Unauthenticated access to Doctor routes
runTest('Unauthenticated user accessing Doctor route (/) is redirected to /login with location preserved', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: false,
    userRole: null,
    allowedRoles: ['doctor'],
    currentPath: '/',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/login');
  assert.strictEqual(result.preserveLocation, true);
});

// 2. Unauthenticated access to Admin routes
runTest('Unauthenticated user accessing Admin route (/admin) is redirected to /login with location preserved', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: false,
    userRole: null,
    allowedRoles: ['admin'],
    currentPath: '/admin',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/login');
  assert.strictEqual(result.preserveLocation, true);
});

// 3. Doctor access to Doctor routes
runTest('Authenticated Doctor accessing Doctor route (/) is authorized', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'doctor',
    allowedRoles: ['doctor'],
    currentPath: '/',
  });
  assert.strictEqual(result.status, 'authorized');
});

runTest('Authenticated Doctor accessing Doctor route (/doctor) is authorized', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'doctor',
    allowedRoles: ['doctor'],
    currentPath: '/doctor',
  });
  assert.strictEqual(result.status, 'authorized');
});

// 4. Doctor attempting to access Admin routes
runTest('Authenticated Doctor accessing Admin route (/admin) is blocked and redirected to /', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'doctor',
    allowedRoles: ['admin'],
    currentPath: '/admin',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/');
});

// 5. Admin access to Admin routes
runTest('Authenticated Admin accessing Admin route (/admin) is authorized', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'admin',
    allowedRoles: ['admin'],
    currentPath: '/admin',
  });
  assert.strictEqual(result.status, 'authorized');
});

// 6. Admin attempting to access Doctor routes
runTest('Authenticated Admin accessing Doctor route (/) is blocked and redirected to /admin', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'admin',
    allowedRoles: ['doctor'],
    currentPath: '/',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/admin');
});

// 7. Page refresh simulation: user and token restored from storage
runTest('Page refresh simulation: Stored doctor credentials maintain authorized status on /', () => {
  // Giả lập đọc localStorage lúc refresh: { token: 'jwt...', role: 'doctor' }
  const storedUser = { id: 'u-1', email: 'bacsi.leminh@phusantw.org', role: 'doctor' };
  const hasToken = true;

  const result = getRouteAccessDecision({
    isAuthenticated: hasToken,
    userRole: storedUser.role,
    allowedRoles: ['doctor'],
    currentPath: '/',
  });
  assert.strictEqual(result.status, 'authorized');
});

runTest('Page refresh simulation: Stored admin credentials maintain authorized status on /admin', () => {
  const storedUser = { id: 'u-admin', email: 'admin@precare.vn', role: 'admin' };
  const hasToken = true;

  const result = getRouteAccessDecision({
    isAuthenticated: hasToken,
    userRole: storedUser.role,
    allowedRoles: ['admin'],
    currentPath: '/admin',
  });
  assert.strictEqual(result.status, 'authorized');
});

// 8. Invalid or missing role data
runTest('Missing user role on protected route redirects to /login', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: null,
    allowedRoles: ['doctor'],
    currentPath: '/',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/login');
});

runTest('Unauthorized role (e.g. pregnant_woman) accessing Doctor route redirects to /unauthorized', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'pregnant_woman',
    allowedRoles: ['doctor'],
    currentPath: '/',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/unauthorized');
});

// 9. Infinite redirect loop prevention
runTest('Loop prevention: When fallback target matches current path, redirects to /unauthorized', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'doctor',
    allowedRoles: ['admin'],
    currentPath: '/',
    redirectPath: '/', // if custom redirect matches current
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/unauthorized');
});

console.log('\n------------------------------------------------------------');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} tests passed`);
console.log('------------------------------------------------------------');

if (passedTests !== totalTests) {
  process.exit(1);
}
