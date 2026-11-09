/**
 * Test Suite: Route Guard & Role Separation
 * Chạy với Node: node web_doctor/scripts/test_route_guard.mjs
 */

import assert from 'node:assert';

// Logic getRouteAccessDecision đồng bộ 100% từ src/components/ProtectedRoute.tsx
function getRouteAccessDecision({
  isAuthenticated,
  userRole,
  allowedRoles,
  currentPath,
  redirectPath,
}) {
  // 1. Chưa xác thực hoặc thiếu thông tin vai trò người dùng -> chuyển hướng về /login
  if (!isAuthenticated || !userRole) {
    return {
      status: 'redirect',
      target: '/login',
      preserveLocation: true,
    };
  }

  // 2. Kiểm tra quyền hạn theo danh sách allowedRoles của route
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return {
      status: 'redirect',
      target: redirectPath || '/unauthorized',
    };
  }

  // 3. Phân luồng bảo vệ khu vực theo vai trò (Role-based area isolation):
  // - Bác sĩ cố tình vào khu vực quản trị (/admin) -> Chặn 403 (/unauthorized)
  if (userRole === 'doctor' && currentPath.startsWith('/admin')) {
    return {
      status: 'redirect',
      target: redirectPath || '/unauthorized',
    };
  }

  // - Quản trị viên cố tình vào khu vực lâm sàng Bác sĩ (không bắt đầu bằng /admin) -> Chặn 403 (/unauthorized)
  if (userRole === 'admin' && !currentPath.startsWith('/admin')) {
    return {
      status: 'redirect',
      target: redirectPath || '/unauthorized',
    };
  }

  // - Thai phụ truy cập cổng Bác sĩ/Admin trên web -> Chặn 403 (/unauthorized)
  if (userRole === 'pregnant_woman') {
    return {
      status: 'redirect',
      target: redirectPath || '/unauthorized',
    };
  }

  // 4. Hợp lệ vai trò và đường dẫn -> Cấp quyền render
  return { status: 'authorized' };
}

console.log('------------------------------------------------------------');
console.log('RUNNING UNIT TESTS FOR ROUTE GUARD & ROLE SEPARATION (403 STRICT)');
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
runTest('Unauthenticated user accessing Admin route (/admin/dashboard) is redirected to /login with location preserved', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: false,
    userRole: null,
    allowedRoles: ['admin'],
    currentPath: '/admin/dashboard',
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

runTest('Authenticated Doctor accessing Doctor route (/dashboard) is authorized', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'doctor',
    allowedRoles: ['doctor'],
    currentPath: '/dashboard',
  });
  assert.strictEqual(result.status, 'authorized');
});

// 4. Doctor attempting to access Admin routes -> Must be blocked to 403 (/unauthorized)
runTest('Authenticated Doctor accessing Admin route (/admin/dashboard) is blocked with 403 (/unauthorized)', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'doctor',
    allowedRoles: ['admin'],
    currentPath: '/admin/dashboard',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/unauthorized');
});

runTest('Authenticated Doctor accessing Admin route (/admin) is blocked with 403 (/unauthorized)', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'doctor',
    allowedRoles: ['admin'],
    currentPath: '/admin',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/unauthorized');
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

runTest('Authenticated Admin accessing Admin route (/admin/dashboard) is authorized', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'admin',
    allowedRoles: ['admin'],
    currentPath: '/admin/dashboard',
  });
  assert.strictEqual(result.status, 'authorized');
});

// 6. Admin attempting to access Doctor routes -> Must be blocked with 403 (/unauthorized)
runTest('Authenticated Admin accessing Doctor route (/) is blocked with 403 (/unauthorized)', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'admin',
    allowedRoles: ['doctor'],
    currentPath: '/',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/unauthorized');
});

runTest('Authenticated Admin accessing Doctor route (/dashboard) is blocked with 403 (/unauthorized)', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'admin',
    allowedRoles: ['doctor'],
    currentPath: '/dashboard',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/unauthorized');
});

// 7. Page refresh simulation: user and token restored from storage
runTest('Page refresh simulation: Stored doctor credentials maintain authorized status on /', () => {
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

runTest('Page refresh simulation: Stored admin credentials maintain authorized status on /admin/dashboard', () => {
  const storedUser = { id: 'u-admin', email: 'admin@precare.vn', role: 'admin' };
  const hasToken = true;

  const result = getRouteAccessDecision({
    isAuthenticated: hasToken,
    userRole: storedUser.role,
    allowedRoles: ['admin'],
    currentPath: '/admin/dashboard',
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

// 9. Unauthorized roles
runTest('Unauthorized role (pregnant_woman) accessing Doctor route redirects to /unauthorized', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'pregnant_woman',
    allowedRoles: ['doctor'],
    currentPath: '/dashboard',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/unauthorized');
});

runTest('Unauthorized role (pregnant_woman) accessing Admin route redirects to /unauthorized', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'pregnant_woman',
    allowedRoles: ['admin'],
    currentPath: '/admin/dashboard',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/unauthorized');
});

// 10. Unknown / Unrecognized role: NEVER falls back to Doctor (/dashboard)
runTest('Unknown role (e.g. guest or any unhandled string) redirects to /unauthorized', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'guest',
    allowedRoles: ['doctor'],
    currentPath: '/dashboard',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/unauthorized');
  assert.notStrictEqual(result.target, '/dashboard');
  assert.notStrictEqual(result.target, '/');
});

// 11. Custom redirectPath support
runTest('Custom redirectPath is respected when access is denied', () => {
  const result = getRouteAccessDecision({
    isAuthenticated: true,
    userRole: 'doctor',
    allowedRoles: ['admin'],
    currentPath: '/admin/dashboard',
    redirectPath: '/custom-forbidden',
  });
  assert.strictEqual(result.status, 'redirect');
  assert.strictEqual(result.target, '/custom-forbidden');
});

console.log('\n------------------------------------------------------------');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} tests passed`);
console.log('------------------------------------------------------------');

if (passedTests !== totalTests) {
  process.exit(1);
}
