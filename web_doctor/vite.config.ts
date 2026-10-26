import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Dev OTP Plugin:
 * Intercepts POST /api/v1/auth/send-otp (and /api/v1/auth/send_otp) in Vite dev server
 * and sends email via Gmail SMTP using Python standard smtplib and .env credentials.
 */
function devOtpPlugin(): Plugin {
  return {
    name: 'precare-dev-otp-smtp',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        const isSendOtp =
          req.method === 'POST' &&
          (url === '/api/v1/auth/send-otp' ||
            url === '/api/v1/auth/send_otp' ||
            url === '/api/send-otp' ||
            url === '/api/send_otp');

        if (!isSendOtp) {
          return next();
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const email = (data.email || '').trim();
            const otpCode = (data.otp_code || data.otpCode || '').trim();

            if (!email || !otpCode) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Thiếu email hoặc mã OTP' }));
              return;
            }

            const scriptPath = path.resolve(__dirname, 'scripts/send_otp.py');
            console.log(`[PreCare Dev SMTP] 📨 Đang gửi mã OTP ${otpCode} đến ${email} qua Gmail SMTP...`);

            execFile(
              'python',
              [scriptPath, email, otpCode],
              { encoding: 'utf-8', timeout: 25000 },
              (err, stdout, stderr) => {
                res.setHeader('Content-Type', 'application/json');
                try {
                  const parsed = JSON.parse(stdout || '{}');
                  if (parsed.success) {
                    console.log(`[PreCare Dev SMTP] ✔ Đã gửi thành công mã OTP đến ${email}`);
                    res.writeHead(200);
                    res.end(JSON.stringify(parsed));
                  } else {
                    console.error(`[PreCare Dev SMTP] ✖ Lỗi gửi mail: ${parsed.error || stderr}`);
                    res.writeHead(500);
                    res.end(JSON.stringify(parsed));
                  }
                } catch {
                  console.error(`[PreCare Dev SMTP] ✖ Output không hợp lệ: ${stdout} ${stderr}`);
                  res.writeHead(500);
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: stderr || err?.message || 'Lỗi gửi email qua SMTP',
                    })
                  );
                }
              }
            );
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Dữ liệu request không hợp lệ' }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devOtpPlugin()],
  server: {
    port: 3000,
    host: true,
  },
});
