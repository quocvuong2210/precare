import sys
import os
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

# Force UTF-8 stdout on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def load_env():
    env_vars = {}
    current_dir = Path(__file__).resolve().parent
    candidate_paths = [
        current_dir.parent / '.env',
        current_dir.parent.parent / '.env',
        Path('.env'),
    ]
    for p in candidate_paths:
        if p.exists():
            try:
                with open(p, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            k, v = line.split('=', 1)
                            v = v.strip().strip('"').strip("'")
                            env_vars[k.strip()] = v
            except Exception:
                pass
    return env_vars

def send_email(recipient_email, otp_code):
    env_vars = load_env()

    host = env_vars.get('SMTP_HOST') or os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    port = int(env_vars.get('SMTP_PORT') or os.environ.get('SMTP_PORT', 587))
    user = env_vars.get('SMTP_USER') or os.environ.get('SMTP_USER', 'yennhi5033@gmail.com')
    password = env_vars.get('SMTP_PASSWORD') or os.environ.get('SMTP_PASSWORD', 'odfwulrykadqjufk')
    from_email = env_vars.get('EMAILS_FROM_EMAIL') or os.environ.get('EMAILS_FROM_EMAIL', user)
    from_name = env_vars.get('EMAILS_FROM_NAME') or os.environ.get('EMAILS_FROM_NAME', 'PreCare System')

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'[PreCare] Mã xác thực OTP đăng ký tài khoản Bác sĩ: {otp_code}'
    msg['From'] = f'{from_name} <{from_email}>'
    msg['To'] = recipient_email

    text_body = f"""Kính gửi Bác sĩ,

PreCare đã nhận được yêu cầu đăng ký tài khoản Cổng thông tin Bác sĩ (Doctor Portal) với email: {recipient_email}.

Mã xác thực OTP gồm 6 chữ số của bạn là: {otp_code}

Mã này có hiệu lực trong vòng 5 phút kể từ thời điểm gửi.
Vì lý do an toàn bảo mật thông tin y tế, vui lòng không chia sẻ mã này cho bất kỳ ai.

Trân trọng,
Hệ thống Y tế số PreCare
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .card {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }}
        .header {{ background: #0E262E; padding: 28px 32px; color: #ffffff; }}
        .badge {{ display: inline-block; background: #447C72; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 10px; }}
        .title {{ font-size: 20px; font-weight: 700; margin: 0; color: #ffffff; }}
        .body {{ padding: 32px; }}
        .otp-box {{ background: #f0fdfa; border: 2px dashed #0d8a7c; border-radius: 12px; padding: 22px; text-align: center; margin: 24px 0; }}
        .otp-code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0d8a7c; font-family: 'Courier New', Courier, monospace; }}
        .footer {{ border-top: 1px solid #f1f5f9; padding: 20px 32px; font-size: 11.5px; color: #64748b; background: #fafafa; line-height: 1.6; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="badge">PreCare • Doctor Portal</div>
          <h2 class="title">Xác thực đăng ký tài khoản Bác sĩ</h2>
        </div>
        <div class="body">
          <p style="font-size: 14px; line-height: 1.6; margin-top: 0;">
            Kính gửi Bác sĩ,
          </p>
          <p style="font-size: 13.5px; line-height: 1.6; color: #475569;">
            Hệ thống PreCare nhận được yêu cầu đăng ký tài khoản chuyên môn y tế với địa chỉ email: <strong>{recipient_email}</strong>.
            Vui lòng nhập mã OTP 6 chữ số dưới đây vào màn hình đăng ký để hoàn tất xác minh:
          </p>
          <div class="otp-box">
            <div style="font-size: 11.5px; font-weight: 700; color: #0f766e; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em;">
              MÃ XÁC THỰC OTP CỦA BẠN
            </div>
            <div class="otp-code">{otp_code}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
              Mã có hiệu lực trong vòng <strong>5 phút</strong>
            </div>
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
            🔒 Vì mục đích bảo vệ dữ liệu hồ sơ thai sản và thông tin y tế, vui lòng không chia sẻ mã xác thực này cho người khác.
          </p>
        </div>
        <div class="footer">
          © 2026 PreCare Medical Systems Inc. • Cổng thông tin hồ sơ thai sản điện tử dành cho Bác sĩ Sản khoa.
        </div>
      </div>
    </body>
    </html>
    """

    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))

    # Connect to Gmail SMTP
    sent = False
    last_error = None

    ports_to_try = [port]
    if port == 587 and 465 not in ports_to_try:
        ports_to_try.append(465)
    elif port == 465 and 587 not in ports_to_try:
        ports_to_try.append(587)

    for p in ports_to_try:
        try:
            if p == 465:
                server = smtplib.SMTP_SSL(host, p, timeout=15)
            else:
                server = smtplib.SMTP(host, p, timeout=15)
                server.ehlo()
                server.starttls()
                server.ehlo()
            server.login(user, password)
            server.sendmail(from_email, [recipient_email], msg.as_string())
            server.quit()
            sent = True
            break
        except Exception as e:
            last_error = e

    if not sent:
        raise last_error

    return True

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Thiếu email hoặc mã OTP"}))
        sys.exit(1)

    target_email = sys.argv[1].strip()
    otp = sys.argv[2].strip()

    try:
        send_email(target_email, otp)
        print(json.dumps({
            "success": True,
            "message": f"Mã OTP đã được gửi thành công đến {target_email}",
            "email": target_email
        }))
        sys.exit(0)
    except Exception as err:
        print(json.dumps({
            "success": False,
            "error": str(err),
            "email": target_email
        }))
        sys.exit(1)
